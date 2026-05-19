import { Model } from '@nozbe/watermelondb';
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators';

export default class Note extends Model {
  static table = 'notes';

  @text('title') title: string;
  @text('content') content: string;
  @field('is_secure') isSecure: boolean;
  @field('is_marked') isMarked: boolean;
  @text('audio_uri') audioUri: string;

  @readonly @date('created_at') createdAt: Date;
  @readonly @date('updated_at') updatedAt: Date;
}
