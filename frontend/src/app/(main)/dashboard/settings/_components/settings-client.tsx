"use client";

import { useState } from "react";

import { Globe, MessageCircle, Save, Settings, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GeneralSettings {
  telegramSupportLink: string;
  whatsappSupportLink: string;
  discordSupportLink: string;
  supportEmail: string;
  supportPhone: string;
}

interface LandingPageSettings {
  heroTitle: string;
  heroSubtitle: string;
  mentorName: string;
  mentorTitle: string;
  mentorBio: string;
  youtubeChannelUrl: string;
  youtubeChannelName: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  coursesDisplay: string;
  indicatorsDisplay: string;
  botsDisplay: string;
}

const defaultGeneralSettings: GeneralSettings = {
  telegramSupportLink: "",
  whatsappSupportLink: "",
  discordSupportLink: "",
  supportEmail: "",
  supportPhone: "",
};

const defaultLandingSettings: LandingPageSettings = {
  heroTitle: "Spartan Trading Academy",
  heroSubtitle: "Master the markets with professional trading education",
  mentorName: "",
  mentorTitle: "",
  mentorBio: "",
  youtubeChannelUrl: "",
  youtubeChannelName: "",
  contactEmail: "",
  contactPhone: "",
  contactWhatsapp: "",
  coursesDisplay: "",
  indicatorsDisplay: "",
  botsDisplay: "",
};

export function SettingsClient() {
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(defaultGeneralSettings);
  const [landingSettings, setLandingSettings] = useState<LandingPageSettings>(defaultLandingSettings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    // TODO: Save to backend API
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  const handleSaveLanding = async () => {
    setIsSaving(true);
    // TODO: Save to backend API
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6 p-2 md:p-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl tracking-tight flex items-center gap-2">
          <Settings className="size-6" />
          Settings
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage client support links and landing page configuration.
        </p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="landing">Landing Page Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="size-4" />
                Client Support Configuration
              </CardTitle>
              <CardDescription>
                Configure support contact links that appear in the client portal and communications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="telegramSupport">Telegram Support Group Link</Label>
                  <Input
                    id="telegramSupport"
                    placeholder="https://t.me/your_support_group"
                    value={generalSettings.telegramSupportLink}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, telegramSupportLink: e.target.value })
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Telegram group/channel link for client support
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="whatsappSupport">WhatsApp Support Link</Label>
                  <Input
                    id="whatsappSupport"
                    placeholder="https://wa.me/1234567890"
                    value={generalSettings.whatsappSupportLink}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, whatsappSupportLink: e.target.value })
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    WhatsApp direct chat link for client support
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="discordSupport">Discord Support Server Link</Label>
                  <Input
                    id="discordSupport"
                    placeholder="https://discord.gg/your_server"
                    value={generalSettings.discordSupportLink}
                    onChange={(e) =>
                      setGeneralSettings({ ...generalSettings, discordSupportLink: e.target.value })
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Discord server invite link for client support
                  </p>
                </div>

                <Separator className="my-2" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      placeholder="support@example.com"
                      value={generalSettings.supportEmail}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="supportPhone">Support Phone</Label>
                    <Input
                      id="supportPhone"
                      type="tel"
                      placeholder="+1 234 567 890"
                      value={generalSettings.supportPhone}
                      onChange={(e) =>
                        setGeneralSettings({ ...generalSettings, supportPhone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveGeneral} disabled={isSaving}>
                  <Save className="size-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="landing" className="mt-4">
          <div className="grid gap-4">
            {/* Hero Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="size-4" />
                  Hero Section
                </CardTitle>
                <CardDescription>
                  Configure the main hero section content displayed on the landing page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="heroTitle">Hero Title</Label>
                  <Input
                    id="heroTitle"
                    placeholder="Spartan Trading Academy"
                    value={landingSettings.heroTitle}
                    onChange={(e) =>
                      setLandingSettings({ ...landingSettings, heroTitle: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                  <Input
                    id="heroSubtitle"
                    placeholder="Master the markets with professional trading education"
                    value={landingSettings.heroSubtitle}
                    onChange={(e) =>
                      setLandingSettings({ ...landingSettings, heroSubtitle: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Mentor Section */}
            <Card>
              <CardHeader>
                <CardTitle>Mentor Details</CardTitle>
                <CardDescription>
                  Configure the mentor information displayed on the landing page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="mentorName">Mentor Name</Label>
                    <Input
                      id="mentorName"
                      placeholder="John Doe"
                      value={landingSettings.mentorName}
                      onChange={(e) =>
                        setLandingSettings({ ...landingSettings, mentorName: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="mentorTitle">Mentor Title</Label>
                    <Input
                      id="mentorTitle"
                      placeholder="Professional Trader & Educator"
                      value={landingSettings.mentorTitle}
                      onChange={(e) =>
                        setLandingSettings({ ...landingSettings, mentorTitle: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="mentorBio">Mentor Bio</Label>
                  <Input
                    id="mentorBio"
                    placeholder="Brief description about the mentor..."
                    value={landingSettings.mentorBio}
                    onChange={(e) =>
                      setLandingSettings({ ...landingSettings, mentorBio: e.target.value })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* YouTube Channel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="size-4" />
                  YouTube Channel
                </CardTitle>
                <CardDescription>
                  Configure the YouTube channel details displayed on the landing page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="youtubeUrl">YouTube Channel URL</Label>
                    <Input
                      id="youtubeUrl"
                      placeholder="https://youtube.com/@your_channel"
                      value={landingSettings.youtubeChannelUrl}
                      onChange={(e) =>
                        setLandingSettings({ ...landingSettings, youtubeChannelUrl: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="youtubeName">Channel Name</Label>
                    <Input
                      id="youtubeName"
                      placeholder="Spartan Trading Academy"
                      value={landingSettings.youtubeChannelName}
                      onChange={(e) =>
                        setLandingSettings({ ...landingSettings, youtubeChannelName: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Configure the contact details displayed on the landing page footer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      placeholder="contact@example.com"
                      value={landingSettings.contactEmail}
                      onChange={(e) =>
                        setLandingSettings({ ...landingSettings, contactEmail: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      placeholder="+1 234 567 890"
                      value={landingSettings.contactPhone}
                      onChange={(e) =>
                        setLandingSettings({ ...landingSettings, contactPhone: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="contactWhatsapp">WhatsApp Link</Label>
                    <Input
                      id="contactWhatsapp"
                      placeholder="https://wa.me/1234567890"
                      value={landingSettings.contactWhatsapp}
                      onChange={(e) =>
                        setLandingSettings({ ...landingSettings, contactWhatsapp: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Display */}
            <Card>
              <CardHeader>
                <CardTitle>Products Display</CardTitle>
                <CardDescription>
                  Configure which products are highlighted on the landing page. Leave blank to use defaults.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="coursesDisplay">Featured Courses</Label>
                  <Input
                    id="coursesDisplay"
                    placeholder="Comma-separated course names to feature"
                    value={landingSettings.coursesDisplay}
                    onChange={(e) =>
                      setLandingSettings({ ...landingSettings, coursesDisplay: e.target.value })
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Leave blank to show all available courses
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="indicatorsDisplay">Featured Indicators</Label>
                  <Input
                    id="indicatorsDisplay"
                    placeholder="Comma-separated indicator names to feature"
                    value={landingSettings.indicatorsDisplay}
                    onChange={(e) =>
                      setLandingSettings({ ...landingSettings, indicatorsDisplay: e.target.value })
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Leave blank to show all available indicators
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="botsDisplay">Featured Bots</Label>
                  <Input
                    id="botsDisplay"
                    placeholder="Comma-separated bot names to feature"
                    value={landingSettings.botsDisplay}
                    onChange={(e) =>
                      setLandingSettings({ ...landingSettings, botsDisplay: e.target.value })
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Leave blank to show all available bots
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={handleSaveLanding} disabled={isSaving}>
                <Save className="size-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
