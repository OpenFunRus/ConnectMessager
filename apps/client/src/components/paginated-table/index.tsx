import { Button, Input } from '@connectmessager/ui';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';

type TPaginatedTableProps<T> = {
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  searchFilter: (item: T, searchTerm: string) => boolean;
  headerColumns: React.ReactNode;
  gridCols: string;
  itemsPerPage?: number;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

const PaginatedTableComponent = <T,>({
  items,
  renderRow,
  searchFilter,
  headerColumns,
  gridCols,
  itemsPerPage = 10,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No items found.'
}: TPaginatedTableProps<T>) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter((item) => searchFilter(item, searchTerm));
  }, [items, searchTerm, searchFilter]);

  const totalPages = useMemo(
    () => Math.ceil(filteredItems.length / itemsPerPage),
    [filteredItems, itemsPerPage]
  );

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const getPageNumbers = useCallback(() => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8fa2bb]" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-[#2b3544] bg-[#101926]">
        <div
          className={`grid ${gridCols} min-w-max gap-4 border-b border-[#243140] bg-[#172231] px-4 py-3 text-sm font-medium text-[#8fa2bb]`}
        >
          {headerColumns}
        </div>

        <div className="divide-y divide-[#243140]">
          {paginatedItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#8fa2bb]">
              {searchTerm.trim()
                ? `No items found matching "${searchTerm}"`
                : emptyMessage}
            </div>
          ) : (
            paginatedItems.map((item, index) => (
              <div key={index}>
                {renderRow(item, (currentPage - 1) * itemsPerPage + index)}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[#8fa2bb]">
          {filteredItems.length === 0 ? (
            'No items found'
          ) : (
            <>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredItems.length)} of{' '}
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {getPageNumbers().map((pageNum) => (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePageChange(pageNum)}
                className={
                  currentPage === pageNum
                    ? 'min-w-8 border-[#4677b8] bg-[#2c5ea8] text-white hover:border-[#5b8ed1] hover:bg-[#356cbe]'
                    : 'min-w-8 bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white'
                }
              >
                {pageNum}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="bg-[#101926] text-[#8fa2bb] hover:border-[#3d516b] hover:bg-[#1b2940] hover:text-white"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const PaginatedTable = memo(PaginatedTableComponent) as <T>(
  props: TPaginatedTableProps<T>
) => React.ReactElement;

export { PaginatedTable };


