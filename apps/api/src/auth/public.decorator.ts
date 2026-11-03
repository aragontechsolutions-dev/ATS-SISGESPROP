import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

/** Marca una ruta como pública. Todo lo demás exige sesión de administrador (deny by default). */
export const Public = () => SetMetadata(IS_PUBLIC, true);
