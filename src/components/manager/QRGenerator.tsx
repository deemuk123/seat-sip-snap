import { useState, useEffect } from "react";
import { QrCode, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchShows } from "@/lib/supabase-orders";
import { toast } from "sonner";

interface ShowOption {
  id: string;
  movieName: string;
  showTime: string;
  screenNumber: number;
  status: string;
}

const BASE_URL = "https://seat-sip-snap.lovable.app";
const QR_API = "https://api.qrserver.com/v1/create-qr-code/";

function generateSeatRange(input: string): string[] {
  // Supports: A1, A1-A20, A1,A2,B3
  const seats: string[] = [];
  const parts = input.split(",").map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    const rangeMatch = part.match(/^([A-Za-z]+)(\d+)\s*-\s*([A-Za-z]+)?(\d+)$/);
    if (rangeMatch) {
      const prefix = rangeMatch[1].toUpperCase();
      const start = parseInt(rangeMatch[2]);
      const end = parseInt(rangeMatch[4]);
      for (let i = start; i <= end; i++) {
        seats.push(`${prefix}${i}`);
      }
    } else {
      seats.push(part.toUpperCase());
    }
  }
  return seats;
}

export default function QRGenerator() {
  const [shows, setShows] = useState<ShowOption[]>([]);
  const [selectedShow, setSelectedShow] = useState("");
  const [seatInput, setSeatInput] = useState("");
  const [generatedSeats, setGeneratedSeats] = useState<{ seat: string; url: string }[]>([]);

  useEffect(() => {
    fetchShows().then(data => {
      const filtered = data.filter(s => s.status === "running" || s.status === "upcoming");
      setShows(filtered);
    });
  }, []);

  const handleGenerate = () => {
    if (!selectedShow) { toast.error("Please select a show"); return; }
    if (!seatInput.trim()) { toast.error("Please enter seat numbers"); return; }

    const seats = generateSeatRange(seatInput);
    if (seats.length === 0) { toast.error("Invalid seat format"); return; }
    if (seats.length > 50) { toast.error("Max 50 seats at a time"); return; }

    const results = seats.map(seat => ({
      seat,
      url: `${BASE_URL}/?show=${selectedShow}&seat=${seat}`,
    }));

    setGeneratedSeats(results);
    toast.success(`Generated ${results.length} QR codes`);
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedShowData = shows.find(s => s.id === selectedShow);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <QrCode className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-lg text-foreground">Seat QR Codes</h2>
      </div>

      <p className="text-xs text-muted-foreground">
        Generate QR codes for seats. Customers scan → land directly on the menu with show & seat pre-filled.
      </p>

      <div className="space-y-3">
        <div>
          <Label>Show</Label>
          <Select value={selectedShow} onValueChange={setSelectedShow}>
            <SelectTrigger><SelectValue placeholder="Select a show" /></SelectTrigger>
            <SelectContent>
              {shows.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.movieName} — {s.showTime} (Screen {s.screenNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Seats</Label>
          <Input
            value={seatInput}
            onChange={e => setSeatInput(e.target.value)}
            placeholder="e.g. A1-A20 or A1,A2,B3"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Use ranges (A1-A20) or comma-separated (A1,A2,B3)</p>
        </div>
        <Button onClick={handleGenerate} className="w-full">
          <QrCode className="w-4 h-4 mr-1.5" /> Generate QR Codes
        </Button>
      </div>

      {generatedSeats.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{generatedSeats.length} QR codes</span>
            <Button size="sm" variant="outline" onClick={handlePrint}>
              <Printer className="w-3.5 h-3.5 mr-1" /> Print All
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 print:grid-cols-4 print:gap-2">
            {generatedSeats.map(({ seat, url }) => (
              <div key={seat} className="rounded-lg border border-border bg-card p-3 flex flex-col items-center gap-2 print:break-inside-avoid">
                <img
                  src={`${QR_API}?size=150x150&data=${encodeURIComponent(url)}`}
                  alt={`QR for seat ${seat}`}
                  className="w-24 h-24"
                  loading="lazy"
                />
                <div className="text-center">
                  <span className="font-bold text-sm text-foreground">{seat}</span>
                  {selectedShowData && (
                    <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                      {selectedShowData.movieName}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
