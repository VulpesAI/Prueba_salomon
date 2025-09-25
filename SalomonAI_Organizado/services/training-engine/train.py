"""Training orchestration for SalomónAI recommendation models."""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from pathlib import Path
from typing import Dict, Iterable, List, Optional


@dataclass
class FeedbackTrainingSample:
    """Single feedback event used as supervision for the model."""

    amount: float
    category: str
    accepted: bool
    timestamp: datetime

    @classmethod
    def from_dict(cls, payload: Dict[str, str]) -> "FeedbackTrainingSample":
        return cls(
            amount=float(payload.get("amount", 0.0)),
            category=payload.get("category", "otros"),
            accepted=payload.get("action") == "accepted",
            timestamp=datetime.fromisoformat(payload.get("created_at", datetime.now().isoformat())),
        )


class DeploymentStrategy(str, Enum):
    CANARY = "canary"
    BLUE_GREEN = "blue_green"


@dataclass
class TrainingResult:
    version: str
    trained_at: datetime
    metrics: Dict[str, float]
    notes: str = ""

    def as_dict(self) -> Dict[str, str]:
        return {
            "version": self.version,
            "trained_at": self.trained_at.isoformat(),
            "metrics": self.metrics,
            "notes": self.notes,
        }


class ModelRegistry:
    """Persists model versions and metadata to disk."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._models: Dict[str, Dict[str, float]] = {}
        if self.path.exists():
            self._models = json.loads(self.path.read_text())

    def register(self, result: TrainingResult) -> None:
        self._models[result.version] = result.as_dict()
        self.path.write_text(json.dumps(self._models, indent=2))

    def latest_version(self) -> Optional[str]:
        if not self._models:
            return None
        return sorted(self._models.keys())[-1]


class DeploymentManager:
    """Keeps track of the active and staging versions."""

    def __init__(self) -> None:
        self.active_version: Optional[str] = None
        self.staging_version: Optional[str] = None

    def plan(self, version: str, strategy: DeploymentStrategy) -> Dict[str, str]:
        if strategy is DeploymentStrategy.CANARY:
            self.staging_version = version
            return {
                "strategy": strategy.value,
                "message": (
                    "Deploy version %s to a small percentage of traffic and monitor metrics" % version
                ),
            }
        if strategy is DeploymentStrategy.BLUE_GREEN:
            self.staging_version = version
            return {
                "strategy": strategy.value,
                "message": "Stand up a green environment with version %s before swapping" % version,
            }
        raise ValueError(f"Unsupported strategy {strategy}")

    def promote(self) -> Optional[str]:
        if self.staging_version:
            self.active_version = self.staging_version
            self.staging_version = None
        return self.active_version


class RetrainingScheduler:
    """Decides when to run periodic retraining jobs."""

    def __init__(self, interval_hours: int = 24) -> None:
        self.interval = timedelta(hours=interval_hours)
        self.last_run: Optional[datetime] = None

    def should_run(self, now: Optional[datetime] = None) -> bool:
        current_time = now or datetime.now(tz=timezone.utc)
        if self.last_run is None:
            return True
        return current_time - self.last_run >= self.interval

    def mark_run(self, now: Optional[datetime] = None) -> None:
        self.last_run = now or datetime.now(tz=timezone.utc)


class OnlineLearningBuffer:
    """Accumulates feedback events for incremental updates."""

    def __init__(self, max_events: int = 50) -> None:
        self.max_events = max_events
        self._events: List[FeedbackTrainingSample] = []

    def add(self, sample: FeedbackTrainingSample) -> None:
        self._events.append(sample)

    def ready(self) -> bool:
        return len(self._events) >= self.max_events

    def consume(self) -> List[FeedbackTrainingSample]:
        events = list(self._events)
        self._events.clear()
        return events


class TrainingPipeline:
    """High level operations for offline and online retraining."""

    def __init__(self, registry: ModelRegistry, deployments: DeploymentManager) -> None:
        self.registry = registry
        self.deployments = deployments
        self.version_counter = 0

    def _next_version(self) -> str:
        self.version_counter += 1
        return f"v{self.version_counter:03d}"

    def run_offline(self, samples: Iterable[FeedbackTrainingSample]) -> Dict[str, str]:
        result = self._train(samples)
        self.registry.register(result)
        plan = self.deployments.plan(result.version, DeploymentStrategy.CANARY)
        return {
            "version": result.version,
            "metrics": result.metrics,
            "deployment_plan": plan,
        }

    def run_online_update(self, samples: Iterable[FeedbackTrainingSample]) -> Dict[str, float]:
        result = self._train(samples, suffix="-online")
        return result.metrics

    def _train(
        self,
        samples: Iterable[FeedbackTrainingSample],
        suffix: str = "",
    ) -> TrainingResult:
        samples_list = list(samples)
        total = len(samples_list) or 1
        accepted = sum(1 for sample in samples_list if sample.accepted)
        discretionary = sum(1 for sample in samples_list if sample.category in {"entretenimiento", "restaurante"})
        estimated_savings = sum(sample.amount * 0.12 for sample in samples_list if sample.accepted)
        metrics = {
            "acceptance_rate": accepted / total,
            "discretionary_ratio": discretionary / total,
            "estimated_savings": estimated_savings,
        }
        version = f"{self._next_version()}{suffix}"
        return TrainingResult(version=version, trained_at=datetime.now(tz=timezone.utc), metrics=metrics)


class RetrainingOrchestrator:
    """Combines scheduling, offline retraining and online updates."""

    def __init__(
        self,
        pipeline: TrainingPipeline,
        scheduler: RetrainingScheduler,
        buffer: OnlineLearningBuffer,
    ) -> None:
        self.pipeline = pipeline
        self.scheduler = scheduler
        self.buffer = buffer

    def ingest_feedback(self, payload: Dict[str, str]) -> Optional[Dict[str, float]]:
        sample = FeedbackTrainingSample.from_dict(payload)
        self.buffer.add(sample)
        if self.buffer.ready():
            metrics = self.pipeline.run_online_update(self.buffer.consume())
            return metrics
        return None

    def maybe_trigger_offline_run(self, dataset: Iterable[Dict[str, str]]) -> Optional[Dict[str, object]]:
        if not self.scheduler.should_run():
            return None
        samples = [FeedbackTrainingSample.from_dict(item) for item in dataset]
        report = self.pipeline.run_offline(samples)
        self.scheduler.mark_run()
        return report


def load_feedback_history(path: Optional[str]) -> List[Dict[str, str]]:
    if not path:
        return []
    file_path = Path(path)
    if not file_path.exists():
        return []
    return json.loads(file_path.read_text())


def main() -> None:
    """Entry point that can be wired to a cron job or CLI."""

    registry_path = Path(os.getenv("MODEL_REGISTRY_PATH", "./artifacts/model_registry.json"))
    registry = ModelRegistry(registry_path)
    deployments = DeploymentManager()
    pipeline = TrainingPipeline(registry, deployments)
    scheduler = RetrainingScheduler(interval_hours=int(os.getenv("RETRAIN_HOURS", "24")))
    buffer = OnlineLearningBuffer(max_events=int(os.getenv("ONLINE_BATCH", "50")))
    orchestrator = RetrainingOrchestrator(pipeline, scheduler, buffer)

    historical_feedback = load_feedback_history(os.getenv("HISTORICAL_FEEDBACK_PATH"))
    offline_report = orchestrator.maybe_trigger_offline_run(historical_feedback)
    if offline_report:
        print("[offline]", json.dumps(offline_report, indent=2))

    streaming_path = os.getenv("STREAMING_FEEDBACK_PATH")
    streaming_data = load_feedback_history(streaming_path)
    for event in streaming_data:
        online_metrics = orchestrator.ingest_feedback(event)
        if online_metrics:
            print("[online-update]", json.dumps(online_metrics, indent=2))


if __name__ == "__main__":  # pragma: no cover - manual execution entrypoint
    main()
