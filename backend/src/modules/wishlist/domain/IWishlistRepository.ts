import { IRepository } from "../../../shared/domain/IRepository";
import { Wishlist } from "./Wishlist";

export interface IWishlistRepository extends IRepository<Wishlist> {
  save(entity: Wishlist): Promise<Wishlist>;
  findByUserId(userId: number): Promise<Wishlist[]>;
  findByUserAndProduct(userId: number, productId: number): Promise<Wishlist | null>;
  deleteByUserAndProduct(userId: number, productId: number): Promise<boolean>;
}
