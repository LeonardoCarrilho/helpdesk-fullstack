/** Encaminha rejeições de handlers assíncronos para o middleware de erro. */
export function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}
