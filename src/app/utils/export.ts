/**
 * Helper to convert an array of objects into a CSV file and download it.
 */
export function exportToCSV(data: any[], filename: string): void {
  if (!data || !data.length) {
    console.warn('exportToCSV: No data provided to export');
    return;
  }

  // Helper to flatten object keys (e.g. nested objects)
  const flattenObj = (obj: any, parentKey = '', res: any = {}): any => {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const propName = parentKey ? `${parentKey}_${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          flattenObj(obj[key], propName, res);
        } else if (Array.isArray(obj[key])) {
          res[propName] = obj[key].join('; ');
        } else {
          res[propName] = obj[key];
        }
      }
    }
    return res;
  };

  const flattenedData = data.map(item => flattenObj(item));
  const headers = Object.keys(flattenedData[0]);

  const rows = flattenedData.map(row =>
    headers.map(header => {
      let val = row[header];
      if (val === undefined || val === null) {
        val = '';
      }
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
