import nunjucks from 'nunjucks';
import mjml from 'mjml';
import emailAddresses, { ParsedMailbox } from 'email-addresses';

interface TemplateData {
	template: string;
	domain: string;
	sender?: string;
	name?: string;
	subject?: string;
	locale?: string;
}

interface SendTemplateData {
	name: string;
	rcpt: string;
	domain: string;
	locale?: string;
	vars?: object;
}

type FetchResult = { result: any; error: string | null };


class TemplateClient {
	private baseURL: string;
	private user: string;
	private token: string;

    async myfetch(url: string, options: RequestInit): Promise<FetchResult> {
    try {
        const response: Response = await fetch(url, options);

        // Check if the response status indicates an error
        if (!response.ok) {
            const errorMessage = `HTTP error! status: ${response.status}`;
            console.error(errorMessage);
            return { result: null, error: errorMessage };
        }

        // Attempt to parse the response as JSON
        try {
            const jsonResult = await response.json();
            return { result: jsonResult, error: null };
        } catch (jsonError) {
            const errorMessage = "Failed to parse response as JSON";
            console.error(errorMessage, jsonError);
            return { result: null, error: errorMessage };
        }
    } catch (fetchError: any) {
        const errorMessage = `Network or fetch error: ${fetchError.message}`;
        console.error(errorMessage);
        return { result: null, error: errorMessage };
    }
}


	validateEmails(list: string): { valid: string[]; invalid: string[] } {
		const valid = [] as string[],
			invalid = [] as string[];

		const emails = list
			.split(',')
			.map((email) => email.trim())
			.filter((email) => email !== '');
		emails.forEach((email) => {
			const parsed = emailAddresses.parseOneAddress(email);
			if (parsed && (parsed as ParsedMailbox).address) {
				valid.push((parsed as ParsedMailbox).address);
			} else {
				invalid.push(email);
			}
		});
		return { valid, invalid };
	}

	constructor(baseURL: string, user: string, token: string) {
		this.baseURL = baseURL;
		this.user = user;
		this.token = token;
		if (!token || !user || !baseURL) {
			throw new Error('User/token/api-url required');
		}
	}

	private validateTemplate(template: string): void {
		try {
			nunjucks.renderString(template, {});
			const result = mjml(template);
			if (result.errors && result.errors.length > 0) {
				throw new Error(
					`MJML validation errors: ${result.errors.map((e) => e.message).join(', ')}`,
				);
			}
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Template validation failed: ${error.message}`);
			} else {
				throw new Error(
					'Template validation failed with an unknown error',
				);
			}
		}
	}

	private validateSender(sender: string): void {
		const senderPattern = /^[^<>]+<[^<>]+@[^<>]+\.[^<>]+>$/;
		if (!senderPattern.test(sender)) {
			throw new Error(
				'Invalid sender format. Expected "Name <email@example.com>"',
			);
		}
	}

	async postTemplate(templateData: TemplateData): Promise<object> {
		console.log('TEMPLATE');
		const {
			template,
			sender = '',
			domain,
			name,
			subject,
			locale,
		} = templateData;
		if (!template) {
			throw new Error('No template data provided');
		}

		this.validateTemplate(template);
		if (sender) {
			this.validateSender(sender);
		}

		const response: Response = await fetch(
			`${this.baseURL}/api/v1/template`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					template,
					domain,
					sender,
					name,
					subject,
					locale,
					user: this.user,
					token: this.token,
				}),
			},
		);
		console.log(JSON.stringify(response, undefined, 2));
		return response.json() as Promise<object>;
	}

	async postSend(templateData: SendTemplateData): Promise<object> {
	console.log("SENDING");
		const {
			name = '',
			domain = '',
			rcpt = '',
			locale = '',
			vars = {},
		} = templateData;

		if (!name || !rcpt) {
			throw new Error('Invalid request body');
		}

		const { valid, invalid } = this.validateEmails(rcpt);
		if (invalid.length > 0) {
			console.log(`Invalid email address(es): ` + invalid.join(','));
			process.exit(1);
		}

		// this.validateTemplate(template);

		const body = JSON.stringify({
				name,
				rcpt,
				domain,
				locale,
				vars,
				user: this.user,
				token: this.token,
			});
		console.log(JSON.stringify(body, undefined, 2));
		const { result, error } = await this.myfetch(`${this.baseURL}/api/v1/send`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body
		});
		if (result) {
			console.log(JSON.stringify(result, undefined, 2));
		} else {
			console.log(error);
		}


		return result;

	}
}

export default TemplateClient;
