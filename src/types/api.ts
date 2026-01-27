// Tipos personalizados para substituir Next.js em projeto Vite

export interface ApiRequest extends Request {
  json(): Promise<any>;
  nextUrl?: {
    searchParams: URLSearchParams;
  };
}

export class ApiResponse {
  static json(data: any, init?: ResponseInit): Response {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  }
}

// Re-export para compatibilidade
export { ApiRequest as NextRequest, ApiResponse as NextResponse };
