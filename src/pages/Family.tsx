import { useEffect, useState } from "react";
import { Users, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Family = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("child");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("family_members").select("*").eq("parent_user_id", user.id);
      if (data) setMembers(data);
    };
    fetch();
  }, [user]);

  const addMember = async () => {
    if (!name.trim() || !user) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("family_members")
      .insert({ parent_user_id: user.id, member_name: name, member_type: type as any })
      .select()
      .single();
    setAdding(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else if (data) {
      setMembers((prev) => [...prev, data]);
      setName("");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("nav.family")}</h1>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Add Family Member</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="elderly">Elderly</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addMember} disabled={adding || !name.trim()} className="gradient-shield">
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {members.length === 0 ? (
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center py-12">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground">No family members added yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Card key={m.id} className="shadow-card">
              <CardContent className="flex items-center gap-4 py-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-card-foreground">{m.member_name}</p>
                  <p className="text-sm capitalize text-muted-foreground">{m.member_type}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Family;
