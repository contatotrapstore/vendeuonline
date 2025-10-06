import { logger } from "@/lib/logger";

"use client";

import { useState, useEffect } from "react";
import { buildApiUrl } from "@/config/api";
import { useAuthStore, usePermissions } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Eye,
  EyeOff,
  Settings,
  Activity,
  Code,
  CheckCircle,
  XCircle,
  Loader2,
  Save,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface TrackingConfig {
  id?: string;
  key: string;
  value: string;
  description: string;
  isActive: boolean;
  isConfigured: boolean;
}

interface TrackingConfigs {
  [key: string]: TrackingConfig;
}

interface FormData {
  google_analytics_id: string;
  google_tag_manager_id: string;
  meta_pixel_id: string;
}

export default function AdminTrackingPage() {
  const { user, token } = useAuthStore();
  const { isAdmin } = usePermissions();

  const [configs, setConfigs] = useState<TrackingConfigs>({});
  const [formData, setFormData] = useState<FormData>({
    google_analytics_id: "",
    google_tag_manager_id: "",
    meta_pixel_id: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showValues, setShowValues] = useState<{ [key: string]: boolean }>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Verificação de acesso
  useEffect(() => {
    if (!user) {
      window.location.href = "/login";
      return;
    }

    if (!isAdmin) {
      window.location.href = "/unauthorized";
      return;
    }

    loadConfigs();
  }, [user, isAdmin]);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch(buildApiUrl("/api/tracking/admin"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfigs(data.configs);

          // Preencher formulário com valores existentes
          const newFormData: FormData = {
            google_analytics_id: data.configs.google_analytics_id?.value || "",
            google_tag_manager_id: data.configs.google_tag_manager_id?.value || "",
            meta_pixel_id: data.configs.meta_pixel_id?.value || "",
          };
          setFormData(newFormData);
        }
      } else {
        toast.error("Erro ao carregar configurações");
      }
    } catch (error) {
      logger.error("Erro ao carregar configurações:", error);
      toast.error("Erro interno do servidor");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Validar Google Analytics ID
    if (formData.google_analytics_id && !/^G-[A-Z0-9]{10}$/.test(formData.google_analytics_id)) {
      newErrors.google_analytics_id = "Formato inválido. Use: G-XXXXXXXXXX";
    }

    // Validar Google Tag Manager ID
    if (formData.google_tag_manager_id && !/^GTM-[A-Z0-9]+$/.test(formData.google_tag_manager_id)) {
      newErrors.google_tag_manager_id = "Formato inválido. Use: GTM-XXXXXXX";
    }

    // Validar Meta Pixel ID
    if (formData.meta_pixel_id && !/^\d{15,16}$/.test(formData.meta_pixel_id)) {
      newErrors.meta_pixel_id = "Formato inválido. Use apenas números (15-16 dígitos)";
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (key: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Limpar erro quando o usuário começar a digitar
    if (errors[key]) {
      setErrors((prev) => ({
        ...prev,
        [key]: "",
      }));
    }
  };

  const saveConfig = async (key: string, value: string) => {
    try {
      const existingConfig = configs[key];
      const url = "/api/tracking/admin";
      const method = existingConfig?.id ? "PUT" : "POST";

      const payload = existingConfig?.id
        ? { id: existingConfig.id, value, isActive: true }
        : { key, value, isActive: true };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar configuração");
      }

      return data.success;
    } catch (error) {
      logger.error(`Erro ao salvar ${key}:`, error);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Corrija os erros no formulário");
      return;
    }

    setSaving(true);
    let successCount = 0;
    let totalConfigs = 0;

    try {
      for (const [key, value] of Object.entries(formData)) {
        totalConfigs++;
        const success = await saveConfig(key, value);
        if (success) successCount++;
      }

      if (successCount === totalConfigs) {
        toast.success("Todas as configurações foram salvas com sucesso!");
        loadConfigs(); // Recarregar configurações
      } else {
        toast.warning(`${successCount}/${totalConfigs} configurações salvas com sucesso`);
      }
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const toggleShowValue = (key: string) => {
    setShowValues((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const resetForm = () => {
    loadConfigs();
    setErrors({});
    toast.info("Formulário resetado");
  };

  const getStatusBadge = (config: TrackingConfig) => {
    if (!config.isConfigured) {
      return (
        <Badge variant="outline" className="text-gray-500">
          Não configurado
        </Badge>
      );
    }

    if (config.isActive) {
      return (
        <Badge variant="default" className="bg-green-500">
          Ativo
        </Badge>
      );
    }

    return <Badge variant="secondary">Inativo</Badge>;
  };

  const generatePreviewCode = () => {
    const activeConfigs = Object.entries(formData).filter(([_, value]) => value.trim() !== "");

    if (activeConfigs.length === 0) {
      return "Nenhuma configuração ativa para preview.";
    }

    let preview = "<!-- Scripts de Tracking Ativos -->\n\n";

    if (formData.google_analytics_id) {
      preview += `<!-- Google Analytics -->\n`;
      preview += `<script async src="https://www.googletagmanager.com/gtag/js?id=${formData.google_analytics_id}"></script>\n`;
      preview += `<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', '${formData.google_analytics_id}');\n</script>\n\n`;
    }

    if (formData.google_tag_manager_id) {
      preview += `<!-- Google Tag Manager -->\n`;
      preview += `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':\nnew Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],\nj=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=\n'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);\n})(window,document,'script','dataLayer','${formData.google_tag_manager_id}');</script>\n\n`;
    }

    if (formData.meta_pixel_id) {
      preview += `<!-- Meta Pixel -->\n`;
      preview += `<script>\n!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window, document,'script',\n'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', '${formData.meta_pixel_id}');\nfbq('track', 'PageView');\n</script>\n\n`;
    }

    return preview;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configurações de Tracking</h1>
        <p className="text-gray-600">
          Configure pixels de rastreamento do Google e Meta para todo o marketplace
        </p>
      </div>

      <div className="grid gap-6">
        {/* Status Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Status dos Pixels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {["google_analytics_id", "google_tag_manager_id", "meta_pixel_id"].map((key) => {
                const config = configs[key] || {
                  key,
                  value: '',
                  description: '',
                  isConfigured: false,
                  isActive: false
                };
                const labels = {
                  google_analytics_id: "Google Analytics",
                  google_tag_manager_id: "Google Tag Manager", 
                  meta_pixel_id: "Meta Pixel"
                };
                
                return (
                  <div key={key} className="text-center p-4 border rounded-lg">
                    <div className="text-sm font-medium mb-2">{labels[key as keyof typeof labels]}</div>
                    {getStatusBadge(config)}
                    {config.isConfigured && <CheckCircle className="h-4 w-4 text-green-500 mx-auto mt-2" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurar Pixels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Google Analytics */}
              <div className="space-y-2">
                <Label htmlFor="google_analytics_id">Google Analytics 4 (GA4)</Label>
                <div className="relative">
                  <Input
                    id="google_analytics_id"
                    type={showValues.google_analytics_id ? "text" : "password"}
                    value={formData.google_analytics_id}
                    onChange={(e) => handleInputChange("google_analytics_id", e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className={errors.google_analytics_id ? "border-red-500" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleShowValue("google_analytics_id")}
                  >
                    {showValues.google_analytics_id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.google_analytics_id && <p className="text-sm text-red-500">{errors.google_analytics_id}</p>}
                <p className="text-sm text-gray-500">ID de medição do Google Analytics 4 (formato: G-XXXXXXXXXX)</p>
              </div>

              {/* Google Tag Manager */}
              <div className="space-y-2">
                <Label htmlFor="google_tag_manager_id">Google Tag Manager</Label>
                <div className="relative">
                  <Input
                    id="google_tag_manager_id"
                    type={showValues.google_tag_manager_id ? "text" : "password"}
                    value={formData.google_tag_manager_id}
                    onChange={(e) => handleInputChange("google_tag_manager_id", e.target.value)}
                    placeholder="GTM-XXXXXXX"
                    className={errors.google_tag_manager_id ? "border-red-500" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleShowValue("google_tag_manager_id")}
                  >
                    {showValues.google_tag_manager_id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.google_tag_manager_id && <p className="text-sm text-red-500">{errors.google_tag_manager_id}</p>}
                <p className="text-sm text-gray-500">Container ID do Google Tag Manager (formato: GTM-XXXXXXX)</p>
              </div>

              {/* Meta Pixel */}
              <div className="space-y-2">
                <Label htmlFor="meta_pixel_id">Meta/Facebook Pixel</Label>
                <div className="relative">
                  <Input
                    id="meta_pixel_id"
                    type={showValues.meta_pixel_id ? "text" : "password"}
                    value={formData.meta_pixel_id}
                    onChange={(e) => handleInputChange("meta_pixel_id", e.target.value)}
                    placeholder="123456789012345"
                    className={errors.meta_pixel_id ? "border-red-500" : ""}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleShowValue("meta_pixel_id")}
                  >
                    {showValues.meta_pixel_id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.meta_pixel_id && <p className="text-sm text-red-500">{errors.meta_pixel_id}</p>}
                <p className="text-sm text-gray-500">ID do pixel do Meta/Facebook (apenas números, 15-16 dígitos)</p>
              </div>


              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Code Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              Preview do Código
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
              <code>{generatePreviewCode()}</code>
            </pre>
          </CardContent>
        </Card>

        {/* Warning */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> As configurações de tracking afetam todo o marketplace. Certifique-se de que os
            IDs do Google Analytics, Google Tag Manager e Meta Pixel estão corretos antes de salvar.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
