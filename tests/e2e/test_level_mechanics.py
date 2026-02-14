"""E2E tests for level mechanics: night, winch, cliffs, forests, access paths, wildlife."""
import pytest
from playwright.sync_api import Page
from conftest import (
    wait_for_scene, skip_to_level, dismiss_dialogues,
    click_button, assert_scene_active,
    BUTTON_START,
)


class TestNightLevel:
    """Tests for night level rendering and headlight mechanics."""
    
    def test_night_overlay_exists_on_night_level(self, game_page: Page):
        """Test that night overlay is created on night levels (level 6)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        skip_to_level(game_page, 'level_verticaleName')
        
        has_night_overlay = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            return gameScene && gameScene.nightOverlay !== null;
        }""")
        
        assert has_night_overlay, "Night overlay should exist on night level"
    
    def test_headlight_direction_updates_with_movement(self, game_page: Page):
        """Test that headlight direction changes when groomer moves."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        skip_to_level(game_page, 'level_verticaleName')
        
        initial_dir = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            return gameScene?.headlightDirection ? {...gameScene.headlightDirection} : null;
        }""")
        
        game_page.keyboard.down("ArrowRight")
        game_page.wait_for_timeout(500)
        
        new_dir = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            return gameScene?.headlightDirection ? {...gameScene.headlightDirection} : null;
        }""")
        
        game_page.keyboard.up("ArrowRight")
        
        assert new_dir is not None, "Headlight direction should exist"
        assert new_dir['x'] > 0, f"Headlight should face right after moving right, got x={new_dir['x']}"


class TestWinchMechanics:
    """Tests for winch attachment and slack mechanics."""
    
    def test_winch_only_attaches_near_anchor(self, game_page: Page):
        """Test that winch only attaches when groomer is near anchor base."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        skip_to_level(game_page, 'level_verticaleName')
        
        game_page.keyboard.down("ShiftLeft")
        game_page.wait_for_timeout(200)
        
        winch_active = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            return gameScene?.winchSystem?.active ?? false;
        }""")
        
        game_page.keyboard.up("ShiftLeft")
        
        assert not winch_active, "Winch should not attach when far from anchor"
    
    def test_winch_anchor_interface_has_base_y(self, game_page: Page):
        """Test that winch anchors have baseY property for proximity detection."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        
        skip_to_level(game_page, 'level_verticaleName')
        
        anchor_info = game_page.evaluate("""() => {
            const gameScene = window.game?.scene?.getScene('GameScene');
            if (!gameScene?.winchSystem?.anchors?.length) return null;
            const anchor = gameScene.winchSystem.anchors[0];
            return {
                hasX: 'x' in anchor,
                hasY: 'y' in anchor,
                hasBaseY: 'baseY' in anchor,
                hasNumber: 'number' in anchor
            };
        }""")
        
        assert anchor_info is not None, "Should have winch anchors on level 6"
        assert anchor_info['hasBaseY'], "Anchor should have baseY for proximity detection"
        assert anchor_info['hasY'], "Anchor should have y (hook position) for cable"


class TestForestBoundaries:
    """Tests for forest boundary colliders preventing groomer from entering forest."""

    def test_forest_walls_exist_on_dangerous_level(self, game_page: Page):
        """Dangerous levels should have boundary walls beyond cliff zones to block forest."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')
        skip_to_level(game_page, 'level_verticaleName')

        wall_count = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.boundaryWalls?.getLength() ?? 0;
        }""")

        assert wall_count > 0, "Dangerous level should have boundary walls beyond cliff zones"

    def test_forest_walls_exist_on_safe_level(self, game_page: Page):
        """Non-dangerous levels should have boundary walls at piste edges."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        wall_count = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return gs?.boundaryWalls?.getLength() ?? 0;
        }""")

        assert wall_count > 0, "Safe level should have boundary walls at piste edges"


class TestAccessPaths:
    """Tests for service road (access path) physics and geometry."""

    def test_no_boundary_walls_on_access_path(self, game_page: Page):
        """Test that boundary walls don't overlap access path rects (non-dangerous level)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 'level_aigleName')
        dismiss_dialogues(game_page)

        overlaps = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            if (!gs?.geometry?.accessPathRects || !gs?.boundaryWalls) return null;
            let count = 0;
            gs.boundaryWalls.getChildren().forEach(w => {
                const wl = w.x - w.width / 2, wr = w.x + w.width / 2;
                const wt = w.y - w.height / 2, wb = w.y + w.height / 2;
                for (const r of gs.geometry.accessPathRects) {
                    if (wl < r.rightX && wr > r.leftX && wt < r.endY && wb > r.startY) {
                        count++;
                        break;
                    }
                }
            });
            return count;
        }""")

        assert overlaps == 0, f"No boundary walls should overlap access paths, found {overlaps}"

    def test_road_traversable_non_dangerous(self, game_page: Page):
        """Test that groomer can traverse service road on non-dangerous level (level 4)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 'level_aigleName')
        dismiss_dialogues(game_page)

        result = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            const tileSize = gs.tileSize;
            const entryY = 0.4 * gs.level.height;
            const path = gs.geometry.pistePath[Math.floor(entryY)];
            const pisteLeftEdge = (path.centerX - path.width / 2) * tileSize;
            return { pisteLeftEdge: Math.round(pisteLeftEdge), tileSize };
        }""")

        start_x = result['pisteLeftEdge'] + 10
        game_page.evaluate(f"() => {{ const gs = window.game.scene.getScene('GameScene'); gs.groomer.setPosition({start_x}, {0.4 * 80 * result['tileSize']}); }}")
        game_page.wait_for_timeout(200)

        game_page.keyboard.down("a")
        game_page.wait_for_timeout(2000)
        game_page.keyboard.up("a")
        game_page.wait_for_timeout(200)

        pos = game_page.evaluate("() => { const gs = window.game.scene.getScene('GameScene'); return { x: Math.round(gs.groomer.x) }; }")
        assert pos['x'] < start_x - 20, f"Groomer should move left into road, started at {start_x}, ended at {pos['x']}"

    def test_road_traversable_dangerous(self, game_page: Page):
        """Test that groomer can traverse service road on dangerous level (La Verticale)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 'level_verticaleName')
        dismiss_dialogues(game_page)

        result = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            const tileSize = gs.tileSize;
            const entryY = Math.floor(0.35 * gs.level.height);
            const path = gs.geometry.pistePath[entryY];
            const pisteLeftEdge = (path.centerX - path.width / 2) * tileSize;
            return { pisteLeftEdge: Math.round(pisteLeftEdge), entryPixelY: Math.round(entryY * tileSize), tileSize };
        }""")

        start_x = result['pisteLeftEdge'] + 10
        game_page.evaluate(f"() => {{ const gs = window.game.scene.getScene('GameScene'); gs.groomer.setPosition({start_x}, {result['entryPixelY']}); }}")
        game_page.wait_for_timeout(200)

        game_page.keyboard.down("a")
        game_page.wait_for_timeout(2000)
        game_page.keyboard.up("a")
        game_page.wait_for_timeout(200)

        pos = game_page.evaluate("() => { const gs = window.game.scene.getScene('GameScene'); return { x: Math.round(gs.groomer.x) }; }")
        assert pos['x'] < start_x - 20, f"Groomer should move left into road on dangerous level, started at {start_x}, ended at {pos['x']}"

    def test_no_obstacles_on_access_path(self, game_page: Page):
        """Test that physics obstacles (trees/rocks) don't spawn on access paths."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 'level_aigleName')
        dismiss_dialogues(game_page)

        overlaps = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            if (!gs?.geometry?.accessPathRects || !gs?.obstacles) return null;
            let count = 0;
            gs.obstacles.getChildren().forEach(o => {
                for (const r of gs.geometry.accessPathRects) {
                    if (o.x >= r.leftX && o.x <= r.rightX && o.y >= r.startY && o.y <= r.endY) {
                        count++;
                        break;
                    }
                }
            });
            return count;
        }""")

        assert overlaps == 0, f"No obstacles should be on access paths, found {overlaps}"

    def test_no_cliffs_on_access_path(self, game_page: Page):
        """Test that cliff danger zones don't overlap access paths on dangerous levels."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 'level_verticaleName')
        dismiss_dialogues(game_page)

        overlaps = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            if (!gs?.geometry?.accessPathRects || !gs?.geometry?.cliffSegments) return null;
            let count = 0;
            for (const r of gs.geometry.accessPathRects) {
                for (const cliff of gs.geometry.cliffSegments) {
                    if (r.startY < cliff.endY && r.endY > cliff.startY) {
                        // Check X overlap at midpoint
                        const midY = (Math.max(r.startY, cliff.startY) + Math.min(r.endY, cliff.endY)) / 2;
                        const bounds = cliff.getBounds(midY);
                        if (r.leftX < bounds.cliffEnd && r.rightX > bounds.cliffStart) {
                            count++;
                        }
                    }
                }
            }
            return count;
        }""")

        assert overlaps == 0, f"No danger zones should overlap access paths, found {overlaps}"

    def test_boundary_creation_after_geometry(self, game_page: Page):
        """Test that accessPathRects are populated (geometry computed before boundaries)."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 'level_aigleName')
        dismiss_dialogues(game_page)

        info = game_page.evaluate("""() => {
            const gs = window.game?.scene?.getScene('GameScene');
            return {
                rectsCount: gs.geometry.accessPathRects?.length ?? 0,
                curvesCount: gs.geometry.accessPathCurves?.length ?? 0,
                wallsCount: gs.boundaryWalls?.getLength() ?? 0,
                accessPaths: gs.level.accessPaths?.length ?? 0,
            };
        }""")

        assert info['accessPaths'] == 2, "Level 4 should have 2 access paths"
        assert info['rectsCount'] > 0, "accessPathRects should be populated"
        assert info['curvesCount'] == 2, "Should have 2 curve sets"
        assert info['wallsCount'] > 0, "Should have boundary walls"


class TestWildlife:
    """Tests for alpine wildlife system."""

    def test_wildlife_spawns_in_game(self, game_page: Page):
        """Wildlife should spawn on levels that have wildlife config."""
        click_button(game_page, BUTTON_START, "Start Game")
        wait_for_scene(game_page, 'GameScene')

        skip_to_level(game_page, 'level_marmottesName')
        dismiss_dialogues(game_page)

        counts = game_page.evaluate("""() => {
            const gs = window.game.scene.getScene('GameScene');
            if (!gs || !gs.wildlifeSystem) return null;
            return { total: gs.wildlifeSystem.totalCount, active: gs.wildlifeSystem.activeCount };
        }""")

        assert counts is not None, "WildlifeSystem should exist"
        assert counts['total'] > 0, "Wildlife should spawn on level 1"
        assert counts['active'] > 0, "Wildlife should be active initially"

    def test_wildlife_on_menu_screen(self, game_page: Page):
        """Menu screen should have wildlife decorations."""
        wait_for_scene(game_page, 'MenuScene')

        has_graphics = game_page.evaluate("""() => {
            const menu = window.game.scene.getScene('MenuScene');
            if (!menu) return false;
            const graphics = menu.children.list.filter(c => c.type === 'Graphics');
            return graphics.length > 10;
        }""")

        assert has_graphics, "Menu should have wildlife graphics objects"
