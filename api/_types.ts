export type ApiRequest = {
  method?: string;
  headers: { authorization?: string };
  body?: Record<string, unknown>;
  query: Record<string, string | string[] | undefined>;
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
};
