import { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ColumnConfig {
  id: string;
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  visible: boolean;
  width: number;
}

interface ResizableTableProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  children: React.ReactNode;
  className?: string;
}

export const ResizableTable: React.FC<ResizableTableProps> = ({
  columns,
  onColumnsChange,
  children,
  className = ""
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const tableRef = useRef<HTMLTableElement>(null);

  const handleMouseDown = (e: React.MouseEvent, columnId: string, currentWidth: number) => {
    e.preventDefault();
    setIsResizing(true);
    setResizingColumn(columnId);
    setStartX(e.clientX);
    setStartWidth(currentWidth);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizingColumn) return;

      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff); // Minimum 50px width

      const updatedColumns = columns.map(col =>
        col.id === resizingColumn ? { ...col, width: newWidth } : col
      );

      onColumnsChange(updatedColumns);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        setResizingColumn(null);
        
        // Save to localStorage
        localStorage.setItem('userTableColumnWidths', JSON.stringify(
          columns.reduce((acc, col) => ({ ...acc, [col.id]: col.width }), {})
        ));
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizingColumn, startX, startWidth, columns, onColumnsChange]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Table ref={tableRef} className="table-fixed">
        <colgroup>
          <col style={{ width: '48px' }} /> {/* Checkbox column */}
          {columns.map((column) => (
            <col 
              key={column.id} 
              style={{ width: `${column.width}px` }} 
            />
          ))}
        </colgroup>
        
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              {/* Checkbox column header */}
            </TableHead>
            
            {columns.map((column, index) => (
              <TableHead 
                key={column.id}
                className="relative cursor-pointer hover:bg-muted/50 select-none border-r border-border/50"
                style={{ width: `${column.width}px` }}
              >
                <div className="flex items-center justify-between">
                  <span>{column.name}</span>
                </div>
                
                {/* Resize handle */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 group"
                  onMouseDown={(e) => handleMouseDown(e, column.id, column.width)}
                >
                  <div className="h-full w-0.5 bg-transparent group-hover:bg-primary/50 ml-0.25" />
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        
        {children}
      </Table>
    </div>
  );
};
