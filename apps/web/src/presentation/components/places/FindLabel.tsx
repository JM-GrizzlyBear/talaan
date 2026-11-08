import { normalizeLabelCode } from "@talaan/shared";
import { Search } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { TextField } from "../ui/TextField";
import { buttonSecondary } from "../ui/styles";

// Typing the code printed under a QR code, when there's no scanner at hand
export function FindLabel() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const navigate = useNavigate();

  function find(event: FormEvent) {
    event.preventDefault();
    const found = normalizeLabelCode(code);
    if (!found) {
      setError("A label code has 8 letters and numbers, like 7K4Q-M2XD");
      return;
    }
    void navigate(`/l/${found}`);
  }

  return (
    <form
      onSubmit={find}
      noValidate
      className="flex flex-wrap items-end gap-2 rounded-xl border border-edge bg-white p-4"
    >
      <div className="min-w-0 flex-1 basis-48">
        <TextField
          label="Find a label"
          value={code}
          onChange={(v) => {
            setCode(v);
            setError(undefined);
          }}
          placeholder="7K4Q-M2XD"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          error={error}
        />
      </div>
      <button type="submit" className={buttonSecondary}>
        <Search aria-hidden="true" className="size-4" />
        Find
      </button>
    </form>
  );
}
