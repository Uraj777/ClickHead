import { runBrowserTest } from './browserTest';

const encoder = new TextEncoder();
const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = (url.searchParams.get('targetUrl') || '').trim();
  if (!targetUrl) return Response.json({ error: 'A target URL is required.' }, { status: 400 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => { try { controller.enqueue(encoder.encode(sse(event, data))); } catch { /* client disconnected */ } };
      try {
        const result = await runBrowserTest(targetUrl, (event) => { if (event.type !== 'complete') send(event.type, event); });
        send('complete', result);
      } catch (error) {
        send('error', { message: error instanceof Error ? error.message : 'Browser test failed.' });
      } finally {
        try { controller.close(); } catch { /* already closed */ }
      }
    },
    cancel() { /* client disconnected */ },
  });

  return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' } });
}
