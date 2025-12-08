import { ColorMode, ColorModeConfig } from "../types/chat";

export const COLOR_MODE_CONFIG: ColorModeConfig[] = [
  { value: ColorMode.Green, color: "#10b981", label: "Зелёный", title: "QA Test Generation" },
  { value: ColorMode.Lime, color: "#84cc16", label: "Лайм", title: "Generate Pytest Tests" },
  { value: ColorMode.Blue, color: "#3b82f6", label: "Синий", title: "Validate Test Case Code" },
  { value: ColorMode.Purple, color: "#a855f7", label: "Фиолетовый", title: "Optimize Test Suite" },
];

export const MOCK_RESPONSE = `@allure.manual
@allure.label("owner", "maksim")
@allure.feature("Calculator")
@allure.story("Main page")
@allure.suite("UI")
@mark.manual
class CalculatorMainPageTests:

    @allure.title("Main page is displayed")
    @allure.tag("CRITICAL")
    @allure.label("priority", "high")
    def test_main_page_display(self):
        with allure.step("Open calculator main page"):
            pass
        with allure.step("Verify page elements"):
            pass
        with allure.step("Check responsiveness"):
            pass`;

