import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { StatementHistory } from "@/components/authenticated/statements/statement-history"
import { StatementTransactionsTable } from "@/components/authenticated/statements/statement-transactions-table"

describe("StatementHistory", () => {
  it("renders an empty state when there are no statements", () => {
    render(<StatementHistory statements={[]} />)

    expect(
      screen.getByText(/aún no tienes cartolas subidas/i)
    ).toBeInTheDocument()
  })

  it("shows a loading skeleton when fetching statements", () => {
    render(<StatementHistory statements={[]} isLoading />)

    expect(screen.getByTestId("statement-history-skeleton")).toBeInTheDocument()
  })
})

describe("StatementTransactionsTable", () => {
  it("allows editing transactions and emits changes", async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(
      <StatementTransactionsTable
        transactions={[
          {
            id: "txn-1",
            postedAt: "2024-01-05",
            description: "Compra supermercado",
            amount: -15990,
            currency: "CLP",
            merchant: "Supermercado",
            category: "Hogar",
          },
        ]}
        onSave={onSave}
      />
    )

    const descriptionInput = screen.getByLabelText(/Descripción txn-1/i)
    await user.clear(descriptionInput)
    await user.type(descriptionInput, "Compra semanal supermercado")

    const categoryInput = screen.getByLabelText(/Categoría txn-1/i)
    await user.clear(categoryInput)
    await user.type(categoryInput, "Alimentos")

    const saveButton = screen.getByTestId("save-transactions-button")
    expect(saveButton).toBeEnabled()

    await user.click(saveButton)

    expect(onSave).toHaveBeenCalledWith([
      {
        transactionId: "txn-1",
        draft: {
          description: "Compra semanal supermercado",
          category: "Alimentos",
        },
      },
    ])
  })
})
