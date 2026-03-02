import React, { useRef, useState } from 'react';
import * as xlsx from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';

export interface FieldMapping {
    key: string;
    label: string;
    required?: boolean;
}

interface ExcelImportExportProps<T> {
    data: T[];
    fields: FieldMapping[];
    filename: string;
    onImport: (mappedData: Partial<T>[]) => Promise<void>;
    isLoading?: boolean;
}

export function ExcelImportExport<T>({ data, fields, filename, onImport, isLoading }: ExcelImportExportProps<T>) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isMappingOpen, setIsMappingOpen] = useState(false);
    const [importedData, setImportedData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [columnMap, setColumnMap] = useState<Record<string, string>>({}); // system field key -> excel header name

    const handleExport = () => {
        try {
            // Transform data using field mappings
            const exportData = data.map((item: any) => {
                const row: any = {};
                fields.forEach(f => {
                    // For nested properties like clients.name, handle flattening if needed, 
                    // though for simple exports we'll stick to stringifying or raw values.
                    let val = item[f.key];
                    if (typeof val === 'object' && val !== null) {
                        val = JSON.stringify(val);
                    }
                    row[f.label] = val;
                });
                return row;
            });

            const ws = xlsx.utils.json_to_sheet(exportData);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
            xlsx.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Export successful');
        } catch (error: any) {
            toast.error('Export failed', { description: error.message });
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = xlsx.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData = xlsx.utils.sheet_to_json(ws, { defval: "" });

                if (jsonData.length === 0) {
                    toast.error('The uploaded spreadsheet is empty.');
                    return;
                }

                const parsedHeaders = Object.keys(jsonData[0] as object);
                setHeaders(parsedHeaders);
                setImportedData(jsonData);

                // Auto-map columns where excel header equals field label (case insensitive)
                const autoMap: Record<string, string> = {};
                fields.forEach(f => {
                    const match = parsedHeaders.find(h => h.toLowerCase() === f.label.toLowerCase() || h.toLowerCase() === f.key.toLowerCase());
                    if (match) {
                        autoMap[f.key] = match;
                    }
                });
                setColumnMap(autoMap);
                setIsMappingOpen(true);
            } catch (error: any) {
                toast.error('Failed to parse Excel file', { description: error.message });
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleConfirmImport = async () => {
        // Validate required fields
        const missing = fields.filter(f => f.required && !columnMap[f.key]);
        if (missing.length > 0) {
            toast.error(`Please map required fields: ${missing.map(m => m.label).join(', ')}`);
            return;
        }

        const mappedResult = importedData.map(row => {
            const mappedRow: any = {};
            fields.forEach(f => {
                if (columnMap[f.key]) {
                    mappedRow[f.key] = row[columnMap[f.key]];
                }
            });
            return mappedRow;
        });

        try {
            await onImport(mappedResult);
            setIsMappingOpen(false);
            setImportedData([]);
            setColumnMap({});
        } catch (error) {
            // Error handling done by parent usually
        }
    };

    return (
        <div className="flex gap-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                <Upload className="w-4 h-4 mr-2" />
                Import
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading || data.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export
            </Button>

            <Dialog open={isMappingOpen} onOpenChange={setIsMappingOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Map Columns</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Match the columns from your spreadsheet to the system fields.
                            If an ID is provided, the record will be updated. If the ID is empty, a new record will be created.
                        </p>

                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>System Field</TableHead>
                                    <TableHead>Required</TableHead>
                                    <TableHead>Spreadsheet Column</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map(field => (
                                    <TableRow key={field.key}>
                                        <TableCell className="font-medium">{field.label}</TableCell>
                                        <TableCell>{field.required ? <span className="text-red-500">* Yes</span> : 'No'}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={columnMap[field.key] || "none"}
                                                onValueChange={(val) => setColumnMap(prev => ({ ...prev, [field.key]: val === "none" ? "" : val }))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Skip column" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">-- Skip Column --</SelectItem>
                                                    {headers.map(h => (
                                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMappingOpen(false)}>Cancel</Button>
                        <Button onClick={handleConfirmImport} disabled={isLoading}>
                            {isLoading ? 'Importing...' : 'Confirm Import'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
