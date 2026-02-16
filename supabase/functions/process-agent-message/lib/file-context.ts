/**
 * File Context - 处理文件附件上下文
 */

export interface AttachmentWithPath {
  url: string;
  path: string;
  name?: string;
  type?: string;
  size?: number;
  [key: string]: any;
}

/**
 * 将附件转换为文件上下文
 */
export async function toFileContext(
  supabase: any,
  attachment: AttachmentWithPath,
  bucket: string = 'attachments',
  expiresIn: number = 86400
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(attachment.path, expiresIn);

  if (error || !data) {
    throw new Error('Failed to get attachment URL', { cause: error || 'Empty data' });
  }

  const newUrl = data.signedUrl || data;
  const finalUrl = typeof newUrl === 'string' ? newUrl : attachment.url;

  // 图片附件
  if (attachment.type?.startsWith('image/')) {
    return { type: 'image', image: finalUrl };
  }

  // 其他文件类型
  const response = await fetch(finalUrl);
  if (!response.ok) {
    throw new Error(`获取文件失败: ${response.statusText}`);
  }

  const fileBuffer = await response.arrayBuffer();
  return {
    type: 'file',
    data: new Uint8Array(fileBuffer),
    mimeType: attachment.type || 'application/octet-stream',
  };
}
