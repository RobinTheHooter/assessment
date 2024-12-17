import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputNumber } from "primereact/inputnumber";
import { Paginator } from "primereact/paginator";
import { OverlayPanel } from "primereact/overlaypanel";

import "primereact/resources/themes/saga-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

interface Artwork {
  id: number;
  title: string;
  place_of_origin?: string;
  artist_display?: string;
  date_start?: string;
  date_end?: string;
}

interface ArtworksResponse {
  data: Artwork[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    total_pages: number;
  };
}

const ArtworkGallery: React.FC = () => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [first, setFirst] = useState<number>(0);
  const [rows, setRows] = useState<number>(10);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [rowCountToSelect, setRowCountToSelect] = useState<number | null>(null);

  const overlayPanelRef = useRef<OverlayPanel>(null);

  // api fetch
  const fetchArtworks = async (page: number) => {
    try {
      setLoading(true);
      const response = await axios.get<ArtworksResponse>(
        `https://api.artic.edu/api/v1/artworks?page=${page}`
      );

      setArtworks(response.data.data);
      setTotalRecords(response.data.pagination.total);
      setError(null);
    } catch (err) {
      setError("Failed to fetch artworks");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtworks(first / rows + 1);
  }, [first, rows]);

  // page change
  const onPageChange = (event: { first: number; rows: number }) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  // row selection/deselection
  const onSelectionChange = (e: { value: Artwork[] }) => {
    const updatedSelectedIds = new Set(selectedIds);
    e.value.forEach((artwork) => updatedSelectedIds.add(artwork.id));

    // responsible for persistence of selected/deselected rows
    const currentPageIds = artworks.map((artwork) => artwork.id);
    currentPageIds.forEach((id) => {
      if (!e.value.find((artwork) => artwork.id === id)) {
        updatedSelectedIds.delete(id);
      }
    });
    setSelectedIds(updatedSelectedIds);
  };

  // input selection
  const handleRowCountSelection = async () => {
    if (rowCountToSelect === null || rowCountToSelect <= 0) return;

    const currentPage = first / rows + 1;

    const fetchRowsAcrossPages = async (totalRowsToSelect: number) => {
      let remainingRowsToSelect = totalRowsToSelect;
      let currentPageToFetch = currentPage;
      const selectedArtworkIds: number[] = [];

      while (remainingRowsToSelect > 0) {
        try {
          const response = await axios.get<ArtworksResponse>(
            `https://api.artic.edu/api/v1/artworks?page=${currentPageToFetch}`
          );

          const pageArtworks = response.data.data;
          const rowsToTakeFromPage = Math.min(
            remainingRowsToSelect,
            pageArtworks.length
          );

          pageArtworks.slice(0, rowsToTakeFromPage).forEach((artwork) => {
            selectedArtworkIds.push(artwork.id);
          });

          remainingRowsToSelect -= rowsToTakeFromPage;
          currentPageToFetch++;
        } catch (err) {
          console.error("Failed to fetch artworks", err);
          break;
        }
      }

      return selectedArtworkIds;
    };

    try {
      const selectedIds = await fetchRowsAcrossPages(rowCountToSelect);

      const updatedSelectedIds = new Set([...selectedIds]);
      setSelectedIds(updatedSelectedIds);
    } catch (err) {
      console.error(err);
    }

    setRowCountToSelect(null);
  };

  return (
    <div>
      {loading ? (
        <i className="pi pi-spin pi-spinner" style={{ fontSize: "2rem" }}></i>
      ) : error ? (
        <div>Error: {error}</div>
      ) : (
        <DataTable
          value={artworks}
          dataKey="id"
          tableStyle={{ minWidth: "50rem" }}
          selection={artworks.filter((artwork) => selectedIds.has(artwork.id))}
          selectionMode="checkbox"
          onSelectionChange={onSelectionChange}
        >
          <Column selectionMode="multiple" headerStyle={{ width: "3em" }} />
          <Column
            header={
              <Button
                icon="pi pi-angle-down"
                onClick={(e) => overlayPanelRef.current?.toggle(e)}
                className="p-button-primary"
                style={{ color: "black" }}
              />
            }
          />
          <Column field="id" header="ID" />
          <Column field="title" header="Title" />
          <Column field="artist_display" header="Artist" />
          <Column field="place_of_origin" header="Origin" />
          <Column field="date_start" header="Date Start" />
          <Column field="date_end" header="Date End" />
        </DataTable>
      )}

      <Paginator
        first={first}
        rows={rows}
        totalRecords={totalRecords}
        onPageChange={onPageChange}
        className="mt-4"
      />

      <OverlayPanel ref={overlayPanelRef} style={{ width: "350px" }}>
        <div className="p-field">
          <label htmlFor="rowCount">Enter Number of Rows to Select</label>
          <InputNumber
            id="rowCount"
            value={rowCountToSelect}
            onValueChange={(e) => setRowCountToSelect(e.value ?? null)}
            min={1}
            max={totalRecords}
            className="w-full"
            placeholder="Enter number of rows"
          />
        </div>

        <div>
          <Button
            label="Select"
            onClick={handleRowCountSelection}
            autoFocus
            style={{ color: "black" }}
          />
        </div>
      </OverlayPanel>
    </div>
  );
};

export default ArtworkGallery;
