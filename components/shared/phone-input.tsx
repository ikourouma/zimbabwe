"use client";

import { useMemo, useState } from "react";
import { countries, flagEmoji, type Country } from "@/lib/data/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function parseValue(value: string): { country: Country; number: string } {
  const match = countries.find((c) => value === c.dialCode || value.startsWith(`${c.dialCode} `));
  if (match) {
    return { country: match, number: value.slice(match.dialCode.length).trim() };
  }
  return { country: countries[0], number: value };
}

/** Hand-rolled country-code + phone field — a country Select (flag + dial code) paired with a
 *  number Input, composed into one formatted value (e.g. "+263 771 234 567"). No phone-number
 *  library dependency, consistent with the rest of the site's forms. */
export function PhoneInput({ id, value, onChange, className }: PhoneInputProps) {
  const initial = useMemo(() => parseValue(value), [value]);
  const [iso2, setIso2] = useState(initial.country.iso2);
  const [number, setNumber] = useState(initial.number);

  const country = countries.find((c) => c.iso2 === iso2) ?? countries[0];

  const emit = (nextIso2: string, nextNumber: string) => {
    const nextCountry = countries.find((c) => c.iso2 === nextIso2) ?? countries[0];
    const trimmed = nextNumber.trim();
    onChange(trimmed ? `${nextCountry.dialCode} ${trimmed}` : "");
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Select
        value={iso2}
        onValueChange={(next) => {
          setIso2(next);
          emit(next, number);
        }}
      >
        <SelectTrigger className="w-[118px] shrink-0 gap-1 px-2.5" aria-label="Country code">
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span className="text-base leading-none">{flagEmoji(country.iso2)}</span>
              <span>{country.dialCode}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {countries.map((c) => (
            <SelectItem key={c.iso2} value={c.iso2}>
              <span className="flex items-center gap-2">
                <span className="text-base leading-none">{flagEmoji(c.iso2)}</span>
                <span>{c.name}</span>
                <span className="text-zim-muted">{c.dialCode}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="771 234 567"
        value={number}
        onChange={(e) => {
          setNumber(e.target.value);
          emit(iso2, e.target.value);
        }}
        className="flex-1"
      />
    </div>
  );
}
