import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { Player, CHARACTER_PROFILES } from '../src/entities/Player.js';

describe('Player', () => {
  it('handles 3-lane runner movement, jump/double-jump, slide hitbox, and dash cooldown', () => {
    let landed = false;
    const player = new Player({ onLand: () => { landed = true; } });

    expect(player.moveLeft()).toBe(true);
    expect(player.getTargetX()).toBe(-3);
    expect(player.moveLeft()).toBe(false);

    expect(player.jump()).toBe(true);
    player.update(0.05);
    expect(player.jump()).toBe(true);
    expect(player.jump()).toBe(false);

    for (let i = 0; i < 40; i += 1) {
      player.update(0.05);
    }
    expect(landed).toBe(true);
    expect(player.isGrounded).toBe(true);

    const standingHeight = player.getBounds().maxY;
    player.slide();
    expect(player.getBounds().maxY).toBeLessThan(standingHeight);

    expect(player.dash()).toBe(true);
    expect(player.getEffectiveForwardSpeed()).toBeGreaterThan(player.forwardSpeed);
    expect(player.dash()).toBe(false);
  });

  it('swaps duo characters, applies stat profiles, and handles shield damage', () => {
    const player = new Player();
    player.setDuoModels(
      { char1: new THREE.Group(), char2: new THREE.Group() },
      'char1',
    );

    expect(player.getActiveCharacterId()).toBe('char1');
    expect(player.jumpForce).toBe(CHARACTER_PROFILES.char1.jumpForce);

    expect(player.swapCharacter()).toBe(true);
    expect(player.getActiveCharacterId()).toBe('char2');
    expect(player.dashCooldown).toBe(CHARACTER_PROFILES.char2.dashCooldown);

    player.grantShield(5);
    const shieldedHit = player.takeDamage();
    expect(shieldedHit).toEqual({ damaged: false, shielded: true, remainingLives: 3 });

    for (let i = 0; i < 30; i += 1) {
      player.update(0.05);
    }
    const directHit = player.takeDamage();
    expect(directHit).toEqual({ damaged: true, shielded: false, remainingLives: 2 });
  });

  it('supports 360-degree arena movement clamped within arenaRadius', () => {
    const player = new Player({ movementMode: 'arena', arenaRadius: 10 });
    player.setMoveInput(1, -1);

    for (let i = 0; i < 40; i += 1) {
      player.update(0.05);
    }

    const radius = Math.hypot(player.position.x, player.position.z);
    expect(radius).toBeLessThanOrEqual(10);
    expect(player.group.rotation.y).toBeLessThan(0);

    player.setMovementMode('runner');
    expect(player.position.z).toBe(0);
    expect(player.group.rotation.y).toBe(0);
  });
});
