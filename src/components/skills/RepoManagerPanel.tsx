import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Trash2, ExternalLink, Plus, Github, Link } from "lucide-react";
import { settingsApi } from "@/lib/api";
import { FullScreenPanel } from "@/components/common/FullScreenPanel";
import type { DiscoverableSkill, SkillRepo, RepoType } from "@/lib/api/skills";

interface RepoManagerPanelProps {
  repos: SkillRepo[];
  skills: DiscoverableSkill[];
  onAdd: (repo: SkillRepo) => Promise<void>;
  onRemove: (owner: string, name: string) => Promise<void>;
  onClose: () => void;
}

export function RepoManagerPanel({
  repos,
  skills,
  onAdd,
  onRemove,
  onClose,
}: RepoManagerPanelProps) {
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
      // 对于 zip 类型，使用 name 匹配
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

    // 验证 URL 格式
    try {
      new URL(zipUrl.trim());
    } catch {
      setError(
        t("skills.repo.invalidZipUrl", { defaultValue: "请输入有效的链接" }),
      );
      return;
    }

    onAdd({
      owner: "zip", // zip 类型使用固定 owner
      name: zipName.trim(),
      branch: "", // zip 类型不需要 branch
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
    <FullScreenPanel
      isOpen={true}
      title={t("skills.repo.title")}
      onClose={onClose}
    >
      {/* 添加仓库表单 */}
      <div className="space-y-4 glass-card rounded-xl p-6">
        <h3 className="text-base font-semibold text-foreground">
          {t("skills.addRepo")}
        </h3>

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
            <div>
              <Label htmlFor="repo-url" className="text-foreground">
                {t("skills.repo.url")}
              </Label>
              <Input
                id="repo-url"
                placeholder={t("skills.repo.urlPlaceholder")}
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="branch" className="text-foreground">
                {t("skills.repo.branch")}
              </Label>
              <Input
                id="branch"
                placeholder={t("skills.repo.branchPlaceholder")}
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="mt-2"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <Button
              onClick={handleAddGithub}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              type="button"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("skills.repo.add")}
            </Button>
          </TabsContent>

          <TabsContent value="zip" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="zip-name" className="text-foreground">
                {t("skills.repo.zipName", { defaultValue: "名称" })}
              </Label>
              <Input
                id="zip-name"
                placeholder={t("skills.repo.zipNamePlaceholder", {
                  defaultValue: "技能包显示名称",
                })}
                value={zipName}
                onChange={(e) => setZipName(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="zip-url" className="text-foreground">
                {t("skills.repo.zipUrlLabel", { defaultValue: "下载链接" })}
              </Label>
              <Input
                id="zip-url"
                placeholder={t("skills.repo.zipUrlPlaceholder", {
                  defaultValue: "https://example.com/skills.zip",
                })}
                value={zipUrl}
                onChange={(e) => setZipUrl(e.target.value)}
                className="mt-2"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            <Button
              onClick={handleAddZip}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              type="button"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("skills.repo.add")}
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {/* 仓库列表 */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-foreground">
          {t("skills.repo.list")}
        </h3>
        {repos.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-xl">
            <p className="text-sm text-muted-foreground">
              {t("skills.repo.empty")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {repos.map((repo) => (
              <div
                key={`${repo.owner}/${repo.name}`}
                className="flex items-center justify-between glass-card rounded-xl px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {repo.repoType === "zip" ? (
                      <Link className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    ) : (
                      <Github className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{getRepoDisplayName(repo)}</span>
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
                    className="hover:bg-black/5 dark:hover:bg-white/5"
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
    </FullScreenPanel>
  );
}
