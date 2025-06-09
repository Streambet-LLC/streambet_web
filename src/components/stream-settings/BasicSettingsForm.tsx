import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BasicSettingsFormProps {
  title: string;
  description: string;
  platform: string;
  channelId: string;
  embedUrl?: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPlatformChange: (value: string) => void;
  onChannelIdChange: (value: string) => void;
  onEmbedUrlChange?: (value: string) => void;
  onSave: () => void;
}

export const BasicSettingsForm = ({
  title,
  description,
  platform,
  channelId,
  embedUrl,
  onTitleChange,
  onDescriptionChange,
  onPlatformChange,
  onChannelIdChange,
  onEmbedUrlChange,
  onSave,
}: BasicSettingsFormProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Stream Title</Label>
        <Input
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          placeholder="Enter stream title"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          placeholder="Enter stream description"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Platform</Label>
        <Select value={platform} onValueChange={onPlatformChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom RTMP</SelectItem>
            <SelectItem value="kick">Kick.com</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="twitch">Twitch</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {platform === 'kick' && onEmbedUrlChange && (
        <div className="space-y-2">
          <Label>Kick.com Channel Name</Label>
          <Input
            value={embedUrl}
            onChange={e => onEmbedUrlChange(e.target.value)}
            placeholder="Enter your Kick channel name (e.g., streambet)"
          />
          <p className="text-sm text-muted-foreground">
            Enter ONLY your channel name (without any domain or prefix):
            <br />- If your channel is at <code>kick.com/streambet</code>, enter{' '}
            <code>streambet</code>
            <br />- Do NOT include "kick.com/" or "player.kick.com/" or any domain prefixes
          </p>
        </div>
      )}

      {platform !== 'custom' && platform !== 'kick' && (
        <div className="space-y-2">
          <Label>Channel ID</Label>
          <Input
            value={channelId}
            onChange={e => onChannelIdChange(e.target.value)}
            placeholder={`Enter your ${platform} channel ID`}
          />
        </div>
      )}

      <Button onClick={onSave} className="w-full">
        Save Settings
      </Button>
    </div>
  );
};
