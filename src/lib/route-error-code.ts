/** Error code shown to users — digest only, never message body. */
export function routeErrorCode(error: { digest?: string }): string {
  return error.digest ? `mf_${error.digest.slice(0, 8)}` : "mf_500";
}
