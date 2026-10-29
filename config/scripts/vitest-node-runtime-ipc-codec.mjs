import { parse, stringify } from 'devalue'

const reducers = {
  Error: (value) =>
    value instanceof Error && {
      name: value.name,
      message: value.message,
      stack: value.stack,
      cause: value.cause
    }
}

const revivers = {
  Error: ({ name, message, stack, cause }) => {
    const error = new Error(message, cause === undefined ? undefined : { cause })
    error.name = name
    error.stack = stack
    return error
  }
}

// Preserves RegExp filters, cyclic test results, and Errors (e.g. a failed module fetch) across Bun/Node's JSON-only IPC.
export function encodeNodeRuntimeMessage(value) {
  return stringify(value, reducers)
}

export function decodeNodeRuntimeMessage(text) {
  // FORK: tests fake IPC with process.emit('message', obj); vitest's own
  // listener receives those too, so non-devalue payloads must pass through.
  if (typeof text !== 'string') {
    return text
  }
  return parse(text, revivers)
}
