// Payload types for email queue jobs.

export interface EmailJobPayload {
  templateId: string;
  to: string;
  templateData: Record<string, unknown>;
  /** Optional BCP-47 locale for template resolution (e.g. 'fr', 'en'). */
  locale?: string;
}
