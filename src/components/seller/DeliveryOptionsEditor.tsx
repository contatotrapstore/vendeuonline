import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Truck } from "lucide-react";
import { DeliveryOption } from "@/types";
import { nanoid } from "nanoid";

interface DeliveryOptionsEditorProps {
  value: DeliveryOption[];
  onChange: (options: DeliveryOption[]) => void;
  maxOptions?: number;
}

export function DeliveryOptionsEditor({
  value = [],
  onChange,
  maxOptions = 10,
}: DeliveryOptionsEditorProps) {
  const addOption = () => {
    if (value.length >= maxOptions) return;

    const newOption: DeliveryOption = {
      id: nanoid(10),
      name: "",
      prazo: "",
      valor: undefined,
    };
    onChange([...value, newOption]);
  };

  const removeOption = (id: string) => {
    onChange(value.filter((opt) => opt.id !== id));
  };

  const updateOption = (id: string, field: keyof DeliveryOption, fieldValue: string | number | undefined) => {
    onChange(
      value.map((opt) =>
        opt.id === id ? { ...opt, [field]: fieldValue } : opt
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-base font-medium">
          <Truck className="h-4 w-4" />
          Formas de Entrega
        </Label>
        <span className="text-sm text-muted-foreground">
          {value.length}/{maxOptions} opções
        </span>
      </div>

      {value.length === 0 && (
        <div className="border border-dashed rounded-lg p-4 text-center text-muted-foreground">
          <p className="text-sm">Nenhuma opção de entrega cadastrada.</p>
          <p className="text-xs mt-1">Adicione formas de entrega para seus clientes escolherem.</p>
        </div>
      )}

      <div className="space-y-3">
        {value.map((option, index) => (
          <div
            key={option.id}
            className="border rounded-lg p-4 space-y-3 bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Opção {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeOption(option.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Label htmlFor={`name-${option.id}`} className="text-xs">
                  Nome *
                </Label>
                <Input
                  id={`name-${option.id}`}
                  placeholder="Ex: Motoboy, Correios PAC"
                  value={option.name}
                  onChange={(e) => updateOption(option.id, "name", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="sm:col-span-1">
                <Label htmlFor={`prazo-${option.id}`} className="text-xs">
                  Prazo estimado
                </Label>
                <Input
                  id={`prazo-${option.id}`}
                  placeholder="Ex: Mesmo dia, 3-5 dias"
                  value={option.prazo || ""}
                  onChange={(e) => updateOption(option.id, "prazo", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="sm:col-span-1">
                <Label htmlFor={`valor-${option.id}`} className="text-xs">
                  Valor (R$)
                </Label>
                <Input
                  id={`valor-${option.id}`}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00 = Grátis"
                  value={option.valor ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateOption(
                      option.id,
                      "valor",
                      val === "" ? undefined : parseFloat(val)
                    );
                  }}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {value.length < maxOptions && (
        <Button
          type="button"
          variant="outline"
          onClick={addOption}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar opção de entrega
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Cadastre as formas de entrega disponíveis para este produto. O comprador
        escolherá uma opção antes de entrar em contato via WhatsApp.
      </p>
    </div>
  );
}
