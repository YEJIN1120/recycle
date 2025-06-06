import React, { useEffect, useState, useMemo } from "react";
import Sidebar from "./Sidebar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DAY_MAPPING = {
  Monday: "월요일",
  Tuesday: "화요일",
  Wednesday: "수요일",
  Thursday: "목요일",
  Friday: "금요일",
  Saturday: "토요일",
  Sunday: "일요일",
};

const BOTTLE_TYPE_ORDER = [
  "갈색병",
  "갈색병(오염)",
  "갈색병(오염+복합)",
  "갈색병(복합)",
  "초록병",
  "초록병(오염)",
  "초록병(오염+복합)",
  "초록병(복합)",
  "흰색병",
  "흰색병(오염)",
  "흰색병(오염+복합)",
  "흰색병(복합)",
  "유리병",
  "유리병(오염)",
  "유리병(오염+복합)",
  "유리병(복합)",
];

const transformData = (data) => {
  return data
    .map((row) => {
      const date = new Date(row.timePeriod);
      return {
        ...row,
        dayOfWeek: DAY_MAPPING[row.dayOfWeek] || row.dayOfWeek, // 요일 매핑
        bottleType: row.bottleType && BOTTLE_TYPE_ORDER.find((type) =>
          type.includes(row.bottleType.replace("_", "").split("+")[0])
        ), // 병 종류 매핑
        recyclable: row.recyclable === 1 || row.recyclable === true ? "가능" : "불가능", // 재활용 여부
        date: date.toISOString().split("T")[0], // 날짜만 추출
        time: date.toTimeString().slice(0, 5), // 시간만 HH:MM 형식
        totalCarbonReduction: parseFloat(row.totalCarbonReduction).toFixed(2), // 소수점 반올림
      };
    })
    .sort((a, b) => new Date(a.timePeriod) - new Date(b.timePeriod)); // 예전 → 최근 정렬
};

const TableWithFiltersAndChart = () => {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [filters, setFilters] = useState({});
  const [chartMode, setChartMode] = useState("yearly"); // "yearly" or "monthly"
  const [availableYears, setAvailableYears] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    fetch("http://10.125.121.221:8080/api/detections/result")
      .then((response) => {
        if (!response.ok) {
          throw new Error("데이터를 가져오는데 실패했습니다.");
        }
        return response.json();
      })
      .then((rawData) => {
        const transformed = transformData(rawData);
        setData(transformed);
        setFilteredData(transformed);

         // 연도 및 월 옵션 생성
         const years = Array.from(
          new Set(transformed.map((row) => new Date(row.date).getFullYear()))
        ).sort((a, b) => b - a);
        setAvailableYears(years);

        const months = Array.from({ length: 12 }, (_, i) => i + 1);
        setAvailableMonths(months);
      })
      .catch((error) => {
        console.error("Error fetching data:", error.message);
      });
  }, []);

  useEffect(() => {
    let filtered = [...data];
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter((row) => String(row[key]) === value);
      }
    });
    setFilteredData(filtered);
  }, [filters, data]);

  const chartData = useMemo(() => {
    const filteredChartData = filteredData.filter((row) => {
      if (chartMode === "yearly" && selectedYear) {
        return new Date(row.date).getFullYear() === parseInt(selectedYear);
      }
      if (chartMode === "monthly" && selectedMonth && selectedYear) {
        const rowDate = new Date(row.date);
        return (
          rowDate.getFullYear() === parseInt(selectedYear) &&
          rowDate.getMonth() + 1 === parseInt(selectedMonth)
        );
      }
      return true;
    });

    return filteredChartData.map((row) => ({
      label: row.date,
      total: parseFloat(row.totalCarbonReduction),
    }));
  }, [filteredData, chartMode, selectedYear, selectedMonth]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || null,
    }));
  };

  const columnHeaders = [
    { key: "dayOfWeek", label: "요일" },
    { key: "bottleType", label: "병 종류" },
    { key: "recyclable", label: "재활용 여부" },
    { key: "videoName", label: "비디오 이름" },
    { key: "totalCount", label: "총 개수", unfilterable: true },
    { key: "date", label: "날짜", unfilterable: true },
    { key: "time", label: "시간" },
    { key: "totalCarbonReduction", label: "탄소 배출\n감소량", unfilterable: true },
  ];

  return (
    <div className="flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 h-screen overflow-y-auto p-6 bg-gray-100">
        <div className="p-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-6">
            탄소배출 감소 데이터
          </h2>

          {/* 차트 모드 선택 */}
          <div className="mb-4 flex justify-center gap-4">
            <button
              className={`px-4 py-2 rounded ${
                chartMode === "yearly" ? "bg-blue-500 text-white" : "bg-gray-300"
              }`}
              onClick={() => setChartMode("yearly")}
            >
              연도별
            </button>
            <button
              className={`px-4 py-2 rounded ${
                chartMode === "monthly" ? "bg-blue-500 text-white" : "bg-gray-300"
              }`}
              onClick={() => setChartMode("monthly")}
            >
              월별
            </button>
          </div>
          {chartMode === "yearly" && (
            <select
              className="mb-4 border p-2 rounded"
              value={selectedYear || ""}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">연도 선택</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
           {chartMode === "monthly" && selectedYear && (
            <select
              className="mb-4 border p-2 rounded"
              value={selectedMonth || ""}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="">월 선택</option>
              {availableMonths.map((month) => (
                <option key={month} value={month}>
                  {month}월
                </option>
              ))}
            </select>
          )}
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#8884d8"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* 테이블 */}
          <div className="overflow-x-auto mb-6">
            <div className="overflow-y-auto max-h-96 border border-gray-300 relative">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-gray-100 z-10">
                  <tr>
                    {columnHeaders.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-2 border border-gray-300 text-left"
                      >
                        {!col.unfilterable ? (
                          <select
                            className="w-full border-none bg-transparent outline-none"
                            onChange={(e) =>
                              handleFilterChange(col.key, e.target.value)
                            }
                            value={filters[col.key] || ""}
                          >
                            <option value="">{col.label}</option>
                            {Array.from(
                              new Set(data.map((row) => row[col.key]))
                            ).map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        ) : (
                          col.label.split("\n").map((line, i) => (
                            <span key={i} className="block">
                              {line}
                            </span>
                          ))
                        )
                        }
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-100"}
                    >
                      {columnHeaders.map((col) => (
                        <td
                          key={col.key}
                          className="px-4 py-2 border border-gray-300"
                        >
                          {row[col.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default TableWithFiltersAndChart;
