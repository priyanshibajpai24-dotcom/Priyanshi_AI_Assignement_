export class AgentError extends Error {
  constructor(code, message, exitCode, details = undefined) {
    super(message);
    this.name = 'AgentError';
    this.code = code;
    this.exitCode = exitCode;
    this.details = details;
  }
}
export const errorPayload = (error) => ({
  error: {
    code: error.code ?? 'INTERNAL_ERROR',
    message: error.message ?? 'The request could not be completed.',
    ...(error.details ? { details: error.details } : {})
  }
});
