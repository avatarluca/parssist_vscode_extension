const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const config = vscode.workspace.getConfiguration('parssist');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	const filePath = context.asAbsolutePath("");

	const generateCMD = vscode.commands.registerCommand('parssist.generate', function () {
		const grammarFile = config.get('grammarFile');
		const lexerFile = config.get('lexerFile');
		const language = config.get('language');
		const algorithm = config.get('algorithm');
		const name = config.get('name');
		const moduleName = config.get('moduleName');
		const writeLogByError = config.get('writeLog');

		const workspacePath = vscode.workspace.rootPath || '';
		const parssistFolderPath = path.join(filePath, 'parssist', 'parssist');
		const parssistGenerationPath = path.join(parssistFolderPath, language);

		const inputGrammarFilePath = path.join(parssistFolderPath, 'input', 'input.gra');
		const inputLexerFilePath = path.join(parssistFolderPath, 'input', 'input.lex');

		const grammarFilePath = path.join(workspacePath, grammarFile);
		const lexerFilePath = path.join(workspacePath, lexerFile);
		const outputFilePath = path.join(workspacePath, name + '.' + language);
		const outputErrorPath = path.join(workspacePath, 'parssist_error_log.txt');

		if (grammarFile && lexerFile) {
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: "Generating source file with Parssist",
				cancellable: false
			}, async (progress) => {
				progress.report({ message: "Reading files..." });

				try {
					const grammarContent = fs.readFileSync(grammarFilePath, 'utf-8');
					const lexerContent = fs.readFileSync(lexerFilePath, 'utf-8');
					fs.writeFileSync(inputGrammarFilePath, grammarContent);
					fs.writeFileSync(inputLexerFilePath, lexerContent);

					progress.report({ message: "Running Parssist command..." });

					const command = `cd ${parssistGenerationPath} && gradlew run --args="codegeneration ../../input/input.lex ../../input/input.gra ${name} ${moduleName} ${algorithm} 1"`;

					return new Promise((resolve, reject) => {
						exec(command, (err, stdout, stderr) => {
							if (err) {
								if(writeLogByError) {
									fs.writeFileSync(outputErrorPath, stderr, 'utf-8');
									if(fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);	
								} else 	fs.writeFileSync(outputFilePath, stderr, 'utf-8');

								vscode.window.showErrorMessage(`Parssist Error: ${err}`);
								reject(err);
								return;
							}
							
							// just relevant output
							const start = stdout.indexOf('package');
							const end = stdout.lastIndexOf('BUILD');
							if(start !== -1 && end !== -1) stdout = stdout.substring(start, end).trim();
							else {
								// Runtime Exception
								const start = stdout.indexOf('Exception');
								const end = stdout.lastIndexOf('BUILD');
								if(start !== -1 && end !== -1) stdout = stdout.substring(start, end).trim();

								if(writeLogByError) {
									fs.writeFileSync(outputErrorPath, stdout, 'utf-8');
									if(fs.existsSync(outputFilePath)) fs.unlinkSync(outputFilePath);	
								} else 	fs.writeFileSync(outputFilePath, stdout, 'utf-8');

								vscode.window.showErrorMessage(`Parssist Error: ${stdout}`);

								reject(err);
								return;
							}

							if(fs.existsSync(outputErrorPath)) fs.unlinkSync(outputErrorPath);

							fs.writeFileSync(outputFilePath, stdout, 'utf-8');
							vscode.window.showInformationMessage('Parser generated successfully!');
							resolve();
						});
					});
				} catch (err) {
					vscode.window.showErrorMessage(`Error generating source file: ${err.message}`);
				}
			});
		} else vscode.window.showErrorMessage('Parssist: Grammar file or lexer file not specified in settings.');
	});

	let setGrammarPathCMD = vscode.commands.registerCommand('parssist.setGrammarPath', async () => {
		const grammarPath = await vscode.window.showInputBox({
			prompt: 'Enter the relative path to the grammar file',
			value: config.get('grammarFile')
		});

		if (grammarPath) {
			await config.update('grammarFile', grammarPath, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage(`Grammar file path set to: ${grammarPath}`);
		}
	});

	let setLexerPathCMD = vscode.commands.registerCommand('parssist.setLexerPath', async () => {
		const lexerPath = await vscode.window.showInputBox({
			prompt: 'Enter the relative path to the lexer file',
			value: config.get('lexerFile')
		});

		if (lexerPath) {
			await config.update('lexerFile', lexerPath, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage(`Lexer file path set to: ${lexerPath}`);
		}
	});

	let setLanguageCMD = vscode.commands.registerCommand('parssist.setLanguage', async () => {
		const language = await vscode.window.showInputBox({
			prompt: 'Enter the parser output language',
			value: config.get('language')
		});

		if (language) {
			await config.update('language', language, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage(`Language set to: ${language}`);
		}
	});

	let setAlgorithmCMD = vscode.commands.registerCommand('parssist.setParserAlgorithm', async () => {
		const algorithm = await vscode.window.showInputBox({
			prompt: 'Enter the algorithm, which is used by the parser',
			value: config.get('algorithm')
		});

		if (algorithm) {
			await config.update('algorithm', algorithm, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage(`Algorithm set to: ${algorithm}`);
		}
	});

	let setNameCMD = vscode.commands.registerCommand('parssist.setParserName', async () => {
		const name = await vscode.window.showInputBox({
			prompt: 'Enter the name of the generated parser',
			value: config.get('name')
		});

		if (name) {
			await config.update('name', name, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage(`Parser name set to: ${name}`);
		}
	});

	let setModuleNameCMD = vscode.commands.registerCommand('parssist.setParserModuleName', async () => {
		const moduleName = await vscode.window.showInputBox({
			prompt: 'Enter the module name of the generated parser',
			value: config.get('moduleName')
		});

		if (moduleName) {
			await config.update('moduleName', moduleName, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage(`Parser module name set to: ${moduleName}`);
		}
	});


	let setErrorLogCMD = vscode.commands.registerCommand('parssist.setErrorLog', async () => {
		const error = await vscode.window.showInputBox({
			prompt: 'Enter if there should be an error log file',
			value: config.get('writeLog')
		});

		if (error) {
			await config.update('writeLog', error, vscode.ConfigurationTarget.Workspace);
			vscode.window.showInformationMessage(`Error Log config set to: ${error}`);
		}
	});

	let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "$(rocket) Parssist"; 
    statusBarItem.tooltip = "Generate Parser using Parssist"; 
    statusBarItem.command = 'parssist.generate';

	statusBarItem.show();

	context.subscriptions.push(generateCMD, statusBarItem);
	context.subscriptions.push(setGrammarPathCMD);
	context.subscriptions.push(setLexerPathCMD);
	context.subscriptions.push(setLanguageCMD);
	context.subscriptions.push(setAlgorithmCMD);
	context.subscriptions.push(setNameCMD);
	context.subscriptions.push(setModuleNameCMD);
	context.subscriptions.push(setErrorLogCMD);
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
};
