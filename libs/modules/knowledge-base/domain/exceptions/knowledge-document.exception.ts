import { DomainException } from '@app/shared/exceptions/domain.exception';
import { ErrorCode } from '@app/shared/exceptions/error-codes';

export class DocumentNotFoundException extends DomainException {
  constructor(id: string) {
    super(ErrorCode.DOCUMENT_NOT_FOUND, `Document with id "${id}" was not found`, { id });
  }
}

export class DocumentInvalidFormatException extends DomainException {
  constructor(mimetype: string) {
    super(ErrorCode.DOCUMENT_INVALID_FORMAT, `Unsupported file type: ${mimetype}`, { mimetype });
  }
}

export class DocumentTooLargeException extends DomainException {
  constructor(sizeBytes: number, maxBytes: number) {
    super(ErrorCode.DOCUMENT_TOO_LARGE, 'File exceeds the maximum allowed size', {
      sizeBytes,
      maxBytes,
    });
  }
}
