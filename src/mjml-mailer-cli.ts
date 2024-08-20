#!/usr/bin/env node

import { Command } from 'commander';
import TemplateClient from './mjml-mailer-client';
import * as fs from 'fs';
import * as readline from 'readline';

const program = new Command();

program
	.option('-a, --api <api>', 'Base API endpoint', 'http://localhost:3000')
	.option(
		'-t, --token <token>',
		'Authentication token in the format "username:token"',
	)
	.option(
		'-f, --file <file>',
		'Path to the file containing the template data (Nunjucks with MJML)',
	)
	.option('-s, --sender <sender>', 'Sender email address')
	.option('-r, --rcpt <rcpt>', 'Recipient email addresses (comma-separated)')
	.option('-n, --name <name>', 'Template name')
	.option('-b, --subject <subject>', 'Email subject')
	.option('-l, --locale <locale>', 'Locale')
	.option('-d, --domain <domain>', 'Domain')
	.option('-v, --vars <vars>', 'Template parameters (JSON string)');

const readStdin = async (): Promise<string> => {

	if (process.stdin.isTTY) {
		return "";
	}
	return new Promise((resolve, reject) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			terminal: false,
		});

		let data = '';

		rl.on('line', (line) => {
			data += line + '\n';
		});

		rl.on('close', () => {
			resolve(data.trim());
		});

		rl.on('error', (err) => {
			reject(err);
		});
	});
};

const getTemplateData = async (): Promise<string> => {
	if (program.opts().file) {
		const filePath = program.opts().file;
		if (!fs.existsSync(filePath)) {
			throw new Error(`File not found: ${filePath}`);
		}
		return fs.readFileSync(filePath, 'utf-8');
	} else {
		return await readStdin();
	}
};

const parseToken = (): { user: string; token: string } => {
	const tokenOption = program.opts().token;
	if (!tokenOption) {
		throw new Error('Authentication token is required');
	}

	const [user, token] = tokenOption.split(':');
	if (!user || !token) {
		throw new Error('Invalid token format. Expected "username:token"');
	}

	return { user, token };
};

program
	.command('template')
	.description('Store a template on the server')
	.action(async () => {
		const { user, token } = parseToken();
		const client = new TemplateClient(program.opts().api, user, token);

		try {
			const template = await getTemplateData();
			const templateData = {
				template,
				sender: program.opts().sender,
				name: program.opts().name,
				subject: program.opts().subject,
				locale: program.opts().locale,
				domain: program.opts().domain,
			};
			const result = await client.postTemplate(templateData);
			console.log('Response:', result);
		} catch (error) {
			if (error instanceof Error) {
				console.error('Error:', error.message);
			} else {
				console.error('An unknown error occurred.');
			}
		}
	});

program
	.command('send')
	.description('Send a template to recipients')
	.action(async () => {
		const { user, token } = parseToken();
		const client = new TemplateClient(program.opts().api, user, token);
		try {
			const template = await getTemplateData();
			const vars: any = program.opts().vars ? JSON.parse(program.opts().vars) : "{}";
			const templateData = {
				name: program.opts().name,
				rcpt: program.opts().rcpt,
				domain: program.opts().domain,
				locale: program.opts().locale,
				vars: vars,
			};
			const result = await client.postSend(templateData);
			console.log('Response:', result);
		} catch (error) {
			if (error instanceof Error) {
				console.error('Error:', error.message);
			} else {
				console.error('An unknown error occurred.');
			}
		}
	});

program.parse(process.argv);
