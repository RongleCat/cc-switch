import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, ExternalLink, Plus, Github, Link } from "lucide-react";
import { settingsApi } from "@/lib/api";
import type { DiscoverableSkill, SkillRepo, RepoType } from "@/lib/api/skills";

interface RepoManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repos: SkillRepo[];
  skills: DiscoverableSkill[];
  onAdd: (repo: SkillRepo) => Promise<void>;
  onRemove: (owner: string, name: string) => Promise<void>;
}

export function RepoManager({
  open: isOpen,
  onOpenChange,
  repos,
  skills,
  onAdd,
  onRemove,
}: RepoManagerProps) {
  const { t } = useTranslation();
  // GitHub 表单状态
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("");
  // ZIP 表单状态
  const [zipName, setZipName] = useState("");
  const [zipUrl, setZipUrl] = useState("");
  // 通用状态
  const [error, setError] = useState("");
  const [repoType, setRepoType] = useState<RepoType>("github");

  const getSkillCount = (repo: SkillRepo) => {
    if (repo.repoType === "zip") {
      return skills.filter((skill) => skill.repoName === repo.name).length;
    }
    return skills.filter(
      (skill) =>
        skill.repoOwner === repo.owner &&
        skill.repoName === repo.name &&
        (skill.repoBranch || "main") === (repo.branch || "main"),
    ).length;
  };

  const parseRepoUrl = (
    url: string,
  ): { owner: string; name: string } | null => {
    let cleaned = url.trim();
    cleaned = cleaned.replace(/^https?:\/\/github\.com\//, "");
    cleaned = cleaned.replace(/\.git$/, "");

    const parts = cleaned.split("/");
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { owner: parts[0], name: parts[1] };
    }

    return null;
  };

  function handleAddGithub() {
    setError("");

    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) {
      setError(t("skills.repo.invalidUrl"));
      return;
    }

    onAdd({
      owner: parsed.owner,
      name: parsed.name,
      branch: branch || "main",
      enabled: true,
      repoType: "github",
    })
      .then(() => {
        setRepoUrl("");
        setBranch("");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t("skills.repo.addFailed"));
      });
  }

  function handleAddZip() {
    setError("");

    if (!zipName.trim()) {
      setError(t("skills.repo.nameRequired", { defaultValue: "请输入名称" }));
      return;
    }

    if (!zipUrl.trim()) {
      setError(
        t("skills.repo.zipUrlRequired", { defaultValue: "请输入下载链接" }),
      );
      return;
    }

    try {
      new URL(zipUrl.trim());
    } catch {
      setError(
        t("skills.repo.invalidZipUrl", { defaultValue: "请输入有效的链接" }),
      );
      return;
    }

    onAdd({
      owner: "zip",
      name: zipName.trim(),
      branch: "",
      enabled: true,
      repoType: "zip",
      zipUrl: zipUrl.trim(),
    })
      .then(() => {
        setZipName("");
        setZipUrl("");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : t("skills.repo.addFailed"));
      });
  }

  async function handleOpenRepo(repo: SkillRepo) {
    try {
      if (repo.repoType === "zip" && repo.zipUrl) {
        await settingsApi.openExternal(repo.zipUrl);
      } else {
        await settingsApi.openExternal(
          `https://github.com/${repo.owner}/${repo.name}`,
        );
      }
    } catch (error) {
      console.error("Failed to open URL:", error);
    }
  }

  function getRepoDisplayName(repo: SkillRepo): string {
    if (repo.repoType === "zip") {
      return repo.name;
    }
    return `${repo.owner}/${repo.name}`;
  }

  function getRepoSubtitle(repo: SkillRepo): string {
    if (repo.repoType === "zip") {
      return repo.zipUrl || "";
    }
    return `${t("skills.repo.branch")}: ${repo.branch || "main"}`;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        {/* 固定头部 */}
        <DialogHeader className="flex-shrink-0 border-b border-border-default px-6 py-4">
          <DialogTitle>{t("skills.repo.title")}</DialogTitle>
          <DialogDescription>{t("skills.repo.description")}</DialogDescription>
        </DialogHeader>

        {/* 可滚动内容区域 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {/* 添加仓库表单 */}
          <div className="space-y-5">
            <Tabs
              value={repoType}
              onValueChange={(v) => {
                setRepoType(v as RepoType);
                setError("");
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="github" className="gap-2">
                  <Github className="h-4 w-4" />
                  {t("skills.repo.typeGithub", { defaultValue: "GitHub 仓库" })}
                </TabsTrigger>
                <TabsTrigger value="zip" className="gap-2">
                  <Link className="h-4 w-4" />
                  {t("skills.repo.typeZip", { defaultValue: "技能包链接" })}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="github" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="repo-url">{t("skills.repo.url")}</Label>
                  <div className="flex flex-col gap-3">
                    <Input
                      id="repo-url"
                      placeholder={t("skills.repo.urlPlaceholder")}
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input
                        id="branch"
                        placeholder={t("skills.repo.branchPlaceholder")}
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleAddGithub}
                        className="w-full sm:w-auto sm:px-4"
                        variant="mcp"
                        type="button"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t("skills.repo.add")}
                      </Button>
                    </div>
                  </div>
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="zip" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="zip-name">
                    {t("skills.repo.zipName", { defaultValue: "名称" })}
                  </Label>
                  <Input
                    id="zip-name"
                    placeholder={t("skills.repo.zipNamePlaceholder", {
                      defaultValue: "技能包显示名称",
                    })}
                    value={zipName}
                    onChange={(e) => setZipName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip-url">
                    {t("skills.repo.zipUrlLabel", { defaultValue: "下载链接" })}
                  </Label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      id="zip-url"
                      placeholder={t("skills.repo.zipUrlPlaceholder", {
                        defaultValue: "https://example.com/skills.zip",
                      })}
                      value={zipUrl}
                      onChange={(e) => setZipUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddZip}
                      className="w-full sm:w-auto sm:px-4"
                      variant="mcp"
                      type="button"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("skills.repo.add")}
                    </Button>
                  </div>
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* 仓库列表 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">{t("skills.repo.list")}</h4>
              {repos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("skills.repo.empty")}
                </p>
              ) : (
                <div className="space-y-3">
                  {repos.map((repo) => (
                    <div
                      key={`${repo.owner}/${repo.name}`}
                      className="flex items-center justify-between rounded-xl border border-border-default bg-card px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          {repo.repoType === "zip" ? (
                            <Link className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          ) : (
                            <Github className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          )}
                          <span className="truncate">
                            {getRepoDisplayName(repo)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground truncate pl-6">
                          {getRepoSubtitle(repo)}
                          <span className="ml-3 inline-flex items-center rounded-full border border-border-default px-2 py-0.5 text-[11px]">
                            {t("skills.repo.skillCount", {
                              count: getSkillCount(repo),
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => handleOpenRepo(repo)}
                          title={t("common.view", { defaultValue: "查看" })}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => onRemove(repo.owner, repo.name)}
                          title={t("common.delete")}
                          className="hover:text-red-500 hover:bg-red-100 dark:hover:text-red-400 dark:hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
