// Shared field list and filters for SmartSuite directory/distribution cache sync.

export const REQUIRED_FIELDS = [
  'id', 'title', 'link', 'image', 'images', 'sf4ad525dd', 'sb685ab800',
  'scea90e502', 'description_markdown', 's5576966ee', 'sb788c266b',
  'sed1a49986', 's2d652f699', 's43a4b2808', 's9744d6c51', 's9c0ff01ed',
  's4ad525dd', 'sc584fdf36', 'first_created', 'last_updated',
  'sd6842e687', 's16e7a9d78', 'sfca9050a8', 'sd07d77f5e', 'styrldtq', 's5716bab58',
]

export function shouldKeepRecord(record, reportId) {
  if (reportId === '6857167d82358a0f5e038c3f') {
    return record.sf4ad525dd === true
  }

  if (reportId === '68614a111208586bd05d3c3a') {
    const hasTitle = !!record.title
    const hasDistributionFlag = record.s43a4b2808 === true
    const isColiving = record.sb685ab800?.label?.toLowerCase() === 'coliving'

    return hasTitle && (hasDistributionFlag || isColiving)
  }

  return true
}

export function stripUnusedFields(record) {
  const stripped = {}
  for (const field of REQUIRED_FIELDS) {
    if (field in record) {
      stripped[field] = record[field]
    }
  }
  return stripped
}