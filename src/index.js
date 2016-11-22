'use strict'

import crossSpawn from 'cross-spawn'

const shouldIgnore = (value) => (value === 'ignore' || value === 'inherit')

const parseStdioOption = (value) => {
  let ignoreStdout = false
  let ignoreStderr = false
  if (shouldIgnore(value)) {
    ignoreStdout = true
    ignoreStderr = true
  } else if (Array.isArray(value)) {
    ignoreStdout = shouldIgnore(value[1])
    ignoreStderr = shouldIgnore(value[2])
  }
  return [ignoreStdout, ignoreStderr]
}

const closeArgsToError = (code, signal) => {
  if (signal !== null) {
    const err = new Error(`Exited with signal ${signal}`)
    err.exitSignal = signal
    return err
  }
  if (code !== 0) {
    const err = new Error(`Exited with status ${code}`)
    err.exitStatus = code
    return err
  }
  return null
}

export default (cmd, args, options = {}) => {
  let childProcess
  const promise = new Promise((resolve, reject) => {
    childProcess = crossSpawn(cmd, args, options)

    let stdout = null
    let stderr = null
    const [ignoreStdout, ignoreStderr] = parseStdioOption(options.stdio)
    if (!ignoreStdout) {
      stdout = []
      childProcess.stdout.on('data', (data) => {
        stdout.push(data)
      })
    }
    if (!ignoreStderr) {
      stderr = []
      childProcess.stderr.on('data', (data) => {
        stderr.push(data)
      })
    }
    childProcess.once('exit', (code, signal) => {
      const error = closeArgsToError(code, signal)
      if (error !== null) {
        if (!ignoreStdout) {
          error.stdout = Buffer.concat(stdout)
        }
        if (!ignoreStderr) {
          error.stderr = Buffer.concat(stderr)
        }
        reject(error)
      } else {
        resolve(ignoreStdout ? null : Buffer.concat(stdout))
      }
    })
    childProcess.once('error', reject)
  })
  promise.childProcess = childProcess
  return promise
}
