import { registerTemplate } from "../template-components"
import { ModernTemplate } from "./modern-template"
import { ExpressTemplate } from "./express-template"
import { DeliveryTemplate } from "./delivery-template"
import { PremiumTemplate } from "./premium-template"

registerTemplate("modern", ModernTemplate)
registerTemplate("express", ExpressTemplate)
registerTemplate("delivery", DeliveryTemplate)
registerTemplate("premium", PremiumTemplate)
