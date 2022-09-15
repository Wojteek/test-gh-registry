export function createExec(exec) {
    return async (command, args, options = {}) => {
        let stdout = '';
        let stderr = '';

        return Object.freeze({
            call: await exec.exec(command, args, {
                cwd,
                listeners: {
                    stdout: (data) => {
                        stdout += data.toString();
                    },
                    stderr: (data) => {
                        stderr += data.toString();
                    },
                },
                ...options,
            }),
            stdout,
            stderr,
        });
    }
}
