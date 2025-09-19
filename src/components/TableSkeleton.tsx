import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 10,
  columns = 4
}) => {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <div className="h-4 w-4 bg-muted rounded animate-pulse" />
            </TableHead>
            {Array.from({ length: columns }).map((_, index) => (
              <TableHead key={index}>
                <div className="h-4 bg-muted rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={rowIndex} className="border-b">
              <TableCell className="w-12">
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
              </TableCell>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={colIndex}>
                  <div className="space-y-2">
                    <div 
                      className="h-4 bg-muted rounded animate-pulse" 
                      style={{ width: `${50 + Math.random() * 50}%` }}
                    />
                    {colIndex === 0 && ( // First column has subtitle
                      <div 
                        className="h-3 bg-muted/60 rounded animate-pulse" 
                        style={{ width: `${30 + Math.random() * 40}%` }}
                      />
                    )}
                  </div>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
