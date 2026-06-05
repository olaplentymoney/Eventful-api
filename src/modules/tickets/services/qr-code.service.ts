import QRCode from 'qrcode';
import { env } from '../../../config/env';
import { signPayload, verifyAndDecodePayload } from '../../../shared/utils/crypto';

export interface QrPayload {
  ticketId: string;
  eventId: string;
  userId: string;
  ticketRef: string;
  issuedAt: number;
}

export class QrCodeService {
  /**
   * Creates a signed, tamper-proof QR payload and generates a base64 PNG.
   */
  async generateTicketQr(payload: Omit<QrPayload, 'issuedAt'>): Promise<{
    qrCodeData: string;
    qrCodeUrl: string;
  }> {
    const fullPayload: QrPayload = { ...payload, issuedAt: Date.now() };
    const qrCodeData = signPayload(fullPayload, env.QR_SECRET);

    const qrCodeUrl = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    return { qrCodeData, qrCodeUrl };
  }

  /**
   * Verifies a scanned QR code token. Returns the payload or null if invalid.
   */
  verifyQrCode(token: string): QrPayload | null {
    return verifyAndDecodePayload<QrPayload>(token, env.QR_SECRET);
  }
}

export const qrCodeService = new QrCodeService();
