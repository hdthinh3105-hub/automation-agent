import { AggregateRoot } from '@app/shared/base/aggregate-root.base';
import { IDomainEvent } from '@app/shared/base/aggregate-root.base';

export enum DocumentSourceType {
  FILE = 'FILE',
  URL = 'URL',
  TEXT = 'TEXT',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export interface KnowledgeDocumentProps {
  id: string;
  title: string;
  sourceType: DocumentSourceType;
  filePath: string | null;
  status: DocumentStatus;
  version: number;
  tags: string[];
  uploadedBy: string;
  createdAt: Date;
  deletedAt: Date | null;
}

/**
 * Raised khi tài liệu mới được upload — RAG Module (Phase 5) lắng nghe
 * để trigger chunk/embed (TDD Mục 5.5: "KHÔNG chứa logic vector/embedding
 * để tách biệt quản lý nội dung khỏi biểu diễn vector").
 */
export class DocumentUploadedEvent implements IDomainEvent {
  public readonly eventName = 'knowledge_base.document_uploaded';
  public readonly occurredAt: Date;

  constructor(public readonly documentId: string) {
    this.occurredAt = new Date();
  }
}

/**
 * 🔑 Aggregate Root — Knowledge Base Module (TDD Mục 5.5).
 */
export class KnowledgeDocument extends AggregateRoot<string> {
  private props: KnowledgeDocumentProps;

  private constructor(props: KnowledgeDocumentProps) {
    super(props.id);
    this.props = props;
  }

  public static create(params: {
    id: string;
    title: string;
    sourceType: DocumentSourceType;
    filePath?: string;
    tags?: string[];
    uploadedBy: string;
  }): KnowledgeDocument {
    if (!params.title?.trim()) {
      throw new Error('Document title must not be empty');
    }
    const doc = new KnowledgeDocument({
      id: params.id,
      title: params.title.trim(),
      sourceType: params.sourceType,
      filePath: params.filePath ?? null,
      status: DocumentStatus.PENDING,
      version: 1,
      tags: params.tags ?? [],
      uploadedBy: params.uploadedBy,
      createdAt: new Date(),
      deletedAt: null,
    });
    doc.addDomainEvent(new DocumentUploadedEvent(doc.id));
    return doc;
  }

  public static reconstitute(props: KnowledgeDocumentProps): KnowledgeDocument {
    return new KnowledgeDocument(props);
  }

  public get title(): string {
    return this.props.title;
  }

  public get sourceType(): DocumentSourceType {
    return this.props.sourceType;
  }

  public get filePath(): string | null {
    return this.props.filePath;
  }

  public get status(): DocumentStatus {
    return this.props.status;
  }

  public get version(): number {
    return this.props.version;
  }

  public get tags(): string[] {
    return this.props.tags;
  }

  public get uploadedBy(): string {
    return this.props.uploadedBy;
  }

  public get createdAt(): Date {
    return this.props.createdAt;
  }

  public get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  public markDeleted(): void {
    this.props.deletedAt = new Date();
  }
}
