using System.IO;
using System.IO.Compression;
using System.Text;
using WishWinUI.Core;

namespace WishWinUI.Services;

/// <summary>
/// 手搓 .xlsx（不带第三方库）：
/// Open XML 其实就是一个 zip，里面放几张 xml。表头与列顺序和原网页导出一致。
/// </summary>
public static class ExcelExporter
{
    private static readonly string[] Headers = ["序号", "名称", "星级", "是否UP", "捕获明光是否触发", "日期", "时间"];

    /// <summary>把本周历史写成 xlsx 字节。</summary>
    public static byte[] Build(IReadOnlyList<HistoryRecord> history)
    {
        using var buffer = new MemoryStream();
        using (var zip = new ZipArchive(buffer, ZipArchiveMode.Create, leaveOpen: true))
        {
            Add(zip, "[Content_Types].xml", """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                  <Default Extension="xml" ContentType="application/xml"/>
                  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
                </Types>
                """);

            Add(zip, "_rels/.rels", """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
                </Relationships>
                """);

            Add(zip, "xl/workbook.xml", """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                  <sheets>
                    <sheet name="祈愿记录" sheetId="1" r:id="rId1"/>
                  </sheets>
                </workbook>
                """);

            Add(zip, "xl/_rels/workbook.xml.rels", """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
                </Relationships>
                """);

            Add(zip, "xl/styles.xml", """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <fonts count="2">
                    <font><sz val="11"/><name val="等线"/></font>
                    <font><b/><sz val="11"/><name val="等线"/></font>
                  </fonts>
                  <fills count="2">
                    <fill><patternFill patternType="none"/></fill>
                    <fill><patternFill patternType="gray125"/></fill>
                  </fills>
                  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
                  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
                  <cellXfs count="2">
                    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
                    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
                  </cellXfs>
                </styleSheet>
                """);

            Add(zip, "xl/worksheets/sheet1.xml", BuildSheet(history));
        }
        return buffer.ToArray();
    }

    private static string BuildSheet(IReadOnlyList<HistoryRecord> history)
    {
        var sb = new StringBuilder();
        sb.Append("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>""");
        sb.Append("<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">");
        sb.Append("<cols>");
        int[] widths = [6, 14, 8, 8, 18, 12, 10];
        for (int i = 0; i < widths.Length; i++)
        {
            sb.Append($"""<col min="{i + 1}" max="{i + 1}" width="{widths[i]}" customWidth="1"/>""");
        }
        sb.Append("</cols>");
        sb.Append("<sheetData>");

        // 表头（加粗）
        sb.Append("<row r=\"1\">");
        for (int c = 0; c < Headers.Length; c++)
        {
            sb.Append($"""<c r="{CellRef(c, 1)}" t="inlineStr" s="1"><is><t>{Escape(Headers[c])}</t></is></c>""");
        }
        sb.Append("</row>");

        for (int i = 0; i < history.Count; i++)
        {
            var record = history[i];
            int row = i + 2;
            sb.Append($"<row r=\"{row}\">");
            AppendNumber(sb, 0, row, i + 1);
            AppendText(sb, 1, row, StripHtml(record.Name));
            AppendText(sb, 2, row, record.RarityText);
            AppendText(sb, 3, row, record.IsUP ? "是" : "否");
            AppendText(sb, 4, row, record.TriggeredCaptureLight ? "是" : "否");
            AppendText(sb, 5, row, record.Date);
            AppendText(sb, 6, row, record.Time);
            sb.Append("</row>");
        }

        sb.Append("</sheetData></worksheet>");
        return sb.ToString();
    }

    private static void AppendText(StringBuilder sb, int col, int row, string value) =>
        sb.Append($"""<c r="{CellRef(col, row)}" t="inlineStr"><is><t xml:space="preserve">{Escape(value)}</t></is></c>""");

    private static void AppendNumber(StringBuilder sb, int col, int row, int value) =>
        sb.Append($"""<c r="{CellRef(col, row)}"><v>{value}</v></c>""");

    private static string CellRef(int col, int row) => $"{(char)('A' + col)}{row}";

    private static string Escape(string value) => value
        .Replace("&", "&amp;")
        .Replace("<", "&lt;")
        .Replace(">", "&gt;")
        .Replace("\"", "&quot;");

    private static string StripHtml(string value)
    {
        if (string.IsNullOrEmpty(value)) return string.Empty;
        var sb = new StringBuilder(value.Length);
        bool inTag = false;
        foreach (char c in value)
        {
            if (c == '<') inTag = true;
            else if (c == '>') inTag = false;
            else if (!inTag) sb.Append(c);
        }
        return sb.ToString().Trim();
    }

    private static void Add(ZipArchive zip, string path, string content)
    {
        var entry = zip.CreateEntry(path, CompressionLevel.Optimal);
        using var stream = entry.Open();
        var bytes = new UTF8Encoding(false).GetBytes(content);
        stream.Write(bytes, 0, bytes.Length);
    }
}
