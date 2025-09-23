import { IsArray, IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class ClassifyMovementDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @IsNumber({}, { each: true })
  embedding: number[];
}