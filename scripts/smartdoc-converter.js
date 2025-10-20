/**
 * SmartDoc to Markdown Converter
 * Converts SmartSuite SmartDoc objects to Markdown format
 */

export function convertSmartDocToMarkdown(smartDoc) {
  if (!smartDoc || !smartDoc.data) {
    return ''
  }

  // If content is empty but html exists, try to use that
  if (!smartDoc.data.content || smartDoc.data.content.length === 0) {
    if (smartDoc.html && smartDoc.html.trim()) {
      // Convert HTML to a simple text approximation
      return smartDoc.html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\n\s*\n/g, '\n\n')
        .trim()
    }
    
    // If preview exists, use that
    if (smartDoc.preview && smartDoc.preview.trim()) {
      return smartDoc.preview.trim()
    }
    
    return ''
  }

  return processContentArray(smartDoc.data.content)
}

// Helper function to convert all SmartDoc fields in a record
export function convertAllSmartDocFields(record) {
  const convertedFields = {}
  
  for (const [fieldName, fieldValue] of Object.entries(record)) {
    if (isSmartDocField(fieldValue)) {
      const markdown = convertSmartDocToMarkdown(fieldValue)
      if (markdown) {
        convertedFields[`${fieldName}_markdown`] = markdown
      }
    }
  }
  
  return convertedFields
}

// Helper function to detect if a field contains SmartDoc data
function isSmartDocField(value) {
  return value && 
         typeof value === 'object' && 
         value.data && 
         typeof value.data === 'object' && 
         value.data.type === 'doc' &&
         (value.data.content !== undefined || value.html !== undefined || value.preview !== undefined)
}

function processContentArray(contentArray) {
  if (!Array.isArray(contentArray)) {
    return ''
  }
  
  return contentArray.map(processContentObject).join('')
}

function processContentObject(obj) {
  if (!obj || !obj.type) {
    return ''
  }
  
  switch (obj.type) {
    case 'paragraph':
      return processParagraph(obj)
      
    case 'heading':
      return processHeading(obj)
      
    case 'text':
      return processText(obj)
      
    case 'bullet_list':
      return processBulletList(obj)
      
    case 'ordered_list':
      return processOrderedList(obj)
      
    case 'list_item':
      return processListItem(obj)
      
    case 'table':
      return processTable(obj)
      
    case 'table_row':
      return processTableRow(obj)
      
    case 'table_header':
      return processTableHeader(obj)
      
    case 'table_cell':
      return processTableCell(obj)
      
    case 'code_block':
      return processCodeBlock(obj)
      
    case 'blockquote':
      return processBlockquote(obj)
      
    case 'hard_break':
      return '\n'
      
    case 'horizontal_rule':
      return '\n---\n\n'
      
    case 'check_list':
      return processCheckList(obj)
      
    case 'check_list_item':
      return processCheckListItem(obj)
      
    case 'mention':
      return processMention(obj)
      
    case 'attachment':
      return processAttachment(obj)
      
    case 'image':
      return processImage(obj)
      
    case 'callout':
      return processCallout(obj)
      
    case 'toc':
      return processTableOfContents(obj)
      
    default:
      // For unknown types, try to process content if it exists
      if (obj.content) {
        return processContentArray(obj.content)
      }
      return ''
  }
}

function processParagraph(obj) {
  const content = obj.content ? processContentArray(obj.content) : ''
  const alignment = obj.attrs?.textAlign
  
  if (alignment && alignment !== 'left') {
    // Markdown doesn't have native alignment, but we can add HTML for special cases
    return `<p style="text-align: ${alignment}">${content}</p>\n\n`
  }
  
  return content + '\n\n'
}

function processHeading(obj) {
  const level = obj.attrs?.level || 1
  const content = obj.content ? processContentArray(obj.content) : ''
  const hashes = '#'.repeat(Math.min(level, 6))
  
  return `${hashes} ${content}\n\n`
}

function processText(obj) {
  let text = obj.text || ''
  
  if (obj.marks && Array.isArray(obj.marks)) {
    for (const mark of obj.marks) {
      text = applyTextMark(text, mark)
    }
  }
  
  return text
}

function applyTextMark(text, mark) {
  switch (mark.type) {
    case 'bold':
      return `**${text}**`
      
    case 'italic':
      return `*${text}*`
      
    case 'underline':
      return `<u>${text}</u>`
      
    case 'strike':
      return `~~${text}~~`
      
    case 'code':
      return `\`${text}\``
      
    case 'link':
      const href = mark.attrs?.href || '#'
      const title = mark.attrs?.title ? ` "${mark.attrs.title}"` : ''
      return `[${text}](${href}${title})`
      
    case 'color':
      const color = mark.attrs?.color
      if (color) {
        return `<span style="color: ${color}">${text}</span>`
      }
      return text
      
    case 'highlight':
      const backgroundColor = mark.attrs?.color || mark.attrs?.backgroundColor
      if (backgroundColor) {
        return `<mark style="background-color: ${backgroundColor}">${text}</mark>`
      }
      return `<mark>${text}</mark>`
      
    default:
      return text
  }
}

function processBulletList(obj) {
  const content = obj.content ? processContentArray(obj.content) : ''
  return content + '\n'
}

function processOrderedList(obj) {
  const content = obj.content ? processContentArray(obj.content) : ''
  return content + '\n'
}

function processListItem(obj) {
  const content = obj.content ? processContentArray(obj.content).trim() : ''
  // Determine if this is part of an ordered list by checking parent context
  // For now, we'll default to bullet points
  return `- ${content}\n`
}

function processTable(obj) {
  if (!obj.content || !Array.isArray(obj.content)) {
    return ''
  }
  
  const rows = obj.content.map(processContentObject)
  
  // Add table header separator if first row contains headers
  if (rows.length > 0) {
    const firstRow = obj.content[0]
    if (firstRow && firstRow.content && firstRow.content.some(cell => cell.type === 'table_header')) {
      // Count columns for separator
      const columnCount = firstRow.content.length
      const separator = '|' + ' --- |'.repeat(columnCount) + '\n'
      return rows[0] + separator + rows.slice(1).join('')
    }
  }
  
  return rows.join('') + '\n'
}

function processTableRow(obj) {
  if (!obj.content || !Array.isArray(obj.content)) {
    return '|\n'
  }
  
  const cells = obj.content.map(processContentObject)
  return '|' + cells.join('|') + '|\n'
}

function processTableHeader(obj) {
  const content = obj.content ? processContentArray(obj.content).trim() : ''
  return ` ${content} `
}

function processTableCell(obj) {
  const content = obj.content ? processContentArray(obj.content).trim() : ''
  return ` ${content} `
}

function processCodeBlock(obj) {
  const language = obj.attrs?.language || ''
  const content = obj.content ? processContentArray(obj.content) : ''
  
  return `\`\`\`${language}\n${content}\`\`\`\n\n`
}

function processBlockquote(obj) {
  const content = obj.content ? processContentArray(obj.content) : ''
  const lines = content.split('\n').filter(line => line.trim())
  const quotedLines = lines.map(line => `> ${line}`).join('\n')
  
  return quotedLines + '\n\n'
}

function processCheckList(obj) {
  const content = obj.content ? processContentArray(obj.content) : ''
  return content + '\n'
}

function processCheckListItem(obj) {
  const checked = obj.attrs?.checked || false
  const content = obj.content ? processContentArray(obj.content).trim() : ''
  const checkbox = checked ? '[x]' : '[ ]'
  
  return `- ${checkbox} ${content}\n`
}

function processMention(obj) {
  const title = obj.attrs?.title || 'Unknown User'
  const prefix = obj.attrs?.prefix || '@'
  
  return `${prefix}${title}`
}

function processAttachment(obj) {
  const title = obj.attrs?.title || 'Attachment'
  const url = obj.attrs?.url || '#'
  
  return `[📎 ${title}](${url})`
}

function processImage(obj) {
  const src = obj.attrs?.src || ''
  const alt = obj.attrs?.alt || obj.attrs?.title || 'Image'
  const title = obj.attrs?.title ? ` "${obj.attrs.title}"` : ''
  
  return `![${alt}](${src}${title})\n\n`
}

function processCallout(obj) {
  const type = obj.attrs?.type || 'info'
  const content = obj.content ? processContentArray(obj.content) : ''
  
  // Map callout types to appropriate markdown/HTML
  const calloutMap = {
    'info': '💡',
    'warning': '⚠️',
    'error': '❌',
    'success': '✅',
    'note': '📝'
  }
  
  const icon = calloutMap[type] || '💡'
  
  return `> ${icon} **${type.toUpperCase()}**\n> \n> ${content.replace(/\n/g, '\n> ')}\n\n`
}

function processTableOfContents() {
  // Table of contents is typically generated automatically
  // We'll just add a placeholder
  return `## Table of Contents\n\n*[Table of contents will be generated automatically]*\n\n`
}
