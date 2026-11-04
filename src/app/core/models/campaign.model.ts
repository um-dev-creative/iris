/** Una campaña tal como la devuelve Mercury (`CampaignDetailResponse`) a través del BFF. */
export interface Campaign {
  id: string;
  name: string;
  /** Código del canal (`email`, `telegram`…). */
  channelType: string;
  /** Id de la plantilla definida (`template_defined`) que usa la campaña. */
  templateId?: string | null;
  /** Estado del ciclo de vida (`DRAFT`, `SCHEDULED`…); Mercury lo guarda como texto libre. */
  status: string;
  totalRecipients?: number | null;
  scheduledAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  metadata?: Record<string, unknown> | null;
  /** `false` mientras está pausada. Mercury antiguo no lo envía: se toma como activa. */
  enabled?: boolean | null;
}

/** Avance de envío de una campaña (`CampaignProgressTO`). */
export interface CampaignProgress {
  campaignId: string;
  name?: string;
  totalRecipients: number;
  totalSent: number;
  delivered: number;
  failed: number;
  pending: number;
  opened?: number;
  clicked?: number;
  deliveryRate?: number | null;
  openRate?: number | null;
  createdAt?: string | null;
  lastUpdated?: string | null;
  status?: string;
}

/** Canal por el que puede salir una campaña. */
export interface ChannelType {
  id?: string;
  code: string;
  name: string;
  enabled?: boolean;
}

export interface CampaignRecipient {
  identifier: string;
  name?: string;
  customParams?: Record<string, string>;
}

/** Cuerpo de crear. La aplicación la pone el BFF; `userId` debe ser el de la sesión (Mercury lo comprueba). */
export interface CreateCampaignRequest {
  name: string;
  channelTypeCode: string;
  templateId: string;
  userId: string;
  recipients: CampaignRecipient[];
  templateParams?: Record<string, string>;
  /** Fecha local sin zona (`YYYY-MM-DDTHH:mm:ss`). */
  scheduledAt?: string;
  status: CampaignDraftStatus;
}

export interface UpdateCampaignRequest {
  name?: string;
  templateId?: string;
  recipients?: CampaignRecipient[];
  templateParams?: Record<string, string>;
  scheduledAt?: string;
  status?: CampaignDraftStatus;
}

export interface CreatedCampaign {
  campaignId: string;
  name: string;
  status: string;
  totalRecipients: number;
  createdAt: string;
  scheduledAt?: string | null;
}

/** Estados que Iris deja elegir al crear o editar. */
export type CampaignDraftStatus = 'DRAFT' | 'SCHEDULED';

export const CAMPAIGN_NAME_MAX = 150;
