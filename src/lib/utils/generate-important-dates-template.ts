export function generateImportantDatesTemplate(): string {
  const template = `Week Number,Year,Category,Date Description,Date Value,Time,Notes
7,2025,Stena Dates,Fredag 14/2,15-16/2,,Example note
10,2025,ÖMC Dates,Fredag 7/3,8-9/3,,
12,2025,PE3 Dates,Måndag 17/3,2025-03-17,14:30,PE3 training with time
,2025,Other,Special Date,2025-03-15,,Week number optional`;

  return template;
}
