/**
 * Table Component for A2UI
 * 用于展示结构化数据
 */

'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TableColumn {
  key: string;
  title: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

interface TableComponentProps {
  title?: string;
  columns: TableColumn[];
  data: Array<Record<string, any>>;
  onEvent?: (eventName: string, data: any) => void;
}

export function TableComponent({ title, columns, data, onEvent }: TableComponentProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  style={{ width: column.width }}
                  className={`text-${column.align || 'left'}`}
                >
                  {column.title}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow
                key={index}
                onClick={() => onEvent?.('onRowClick', { row, index })}
                className="cursor-pointer"
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={`text-${column.align || 'left'}`}
                  >
                    {row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
