export const errorToString = (error: unknown): string => {
  if (!error) {
    return "";
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object") {
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error as any)?.message ??
      `Unknown error object (keys: ${Object.keys(error ?? {})}`
    );
  }

  return `Unknown error`;
};
