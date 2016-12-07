# CSV Viewer

The CSV viewer uses [PapaParse] (https://github.com/mholt/PapaParse) to parse CSV and TSV files and [React Virtualized] (https://github.com/bvaughn/react-virtualized) to display the parsed data in a table.

## Screenshot

![Screenshot of CSV viewer](https://gitenterprise.inside-box.net/Preview/Preview/raw/master/docs/viewers/csv.png)

## Behavior

Re-sizing the viewer window will cause the table to re-size and the zoom in and out buttons will increase and decrease font size respectively. Currently, column and row sizes are fixed and overflowing text will be truncated.

This viewer does not support printing.

## Supported File Extensions

`csv, tsv`
