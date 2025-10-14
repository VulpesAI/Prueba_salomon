import { Controller, Req, Sse, UseGuards } from '@nestjs/common';
import { Observable, interval, map, take } from 'rxjs';

import { SupabaseJwtGuard } from '../auth/supabase.guard';

@Controller('conversation')
@UseGuards(SupabaseJwtGuard)
export class ConversationSseController {
  @Sse('stream-sse')
  stream(@Req() _req: unknown): Observable<MessageEvent> {
    const tokens = ['Hola, ', 'Felipe. ', 'Procesando ', '…'];
    return interval(120).pipe(
      take(tokens.length + 1),
      map((i) =>
        i < tokens.length
          ? ({ data: { token: tokens[i] } } as MessageEvent)
          : ({ data: { done: true } } as MessageEvent),
      ),
    );
  }
}
