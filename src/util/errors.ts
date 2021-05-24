function formatMessages(messages: string[]) {
  return `\n[JS Actions]\n${messages.join('\n')}`
}

export const Logs = {
  error: (...messages: string[]) => {
    console.error(formatMessages(messages))
  },
}

export class BaseError extends Error {
  constructor(...messages: string[]) {
    super(formatMessages(messages))
  }
}

export class CycleError<
  TGraphNode extends string | number | symbol
> extends BaseError {
  constructor(loopSequence: TGraphNode[]) {
    const sequenceString = loopSequence.map(String).join(' -> ')

    super(
      'Action dependencies cycle detected in sequence:',
      sequenceString,
      'Check your "actions" object.'
    )
  }
}
