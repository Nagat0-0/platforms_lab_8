using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using lab_8.Models;

namespace lab_8.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly RentalDbContext _context;

    public ProductsController(RentalDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetAll()
    {
        return await _context.Products.OrderBy(p => p.Id).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetById(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound(new { message = "Продукт не знайдено." });

        return product;
    }

    [HttpPost]
    public async Task<ActionResult<Product>> Create(ProductDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Назва продукту є обов'язковою." });

        if (dto.Cost < 0)
            return BadRequest(new { message = "Вартість не може бути від'ємною." });

        if (dto.DailyRentalPrice < 0)
            return BadRequest(new { message = "Ціна за день не може бути від'ємною." });

        var product = new Product
        {
            Title = dto.Title.Trim(),
            Description = dto.Description?.Trim() ?? string.Empty,
            Cost = dto.Cost,
            DailyRentalPrice = dto.DailyRentalPrice
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Product>> Update(int id, ProductDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest(new { message = "Назва продукту є обов'язковою." });

        if (dto.Cost < 0)
            return BadRequest(new { message = "Вартість не може бути від'ємною." });

        if (dto.DailyRentalPrice < 0)
            return BadRequest(new { message = "Ціна за день не може бути від'ємною." });

        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound(new { message = "Продукт не знайдено." });

        product.Title = dto.Title.Trim();
        product.Description = dto.Description?.Trim() ?? string.Empty;
        product.Cost = dto.Cost;
        product.DailyRentalPrice = dto.DailyRentalPrice;

        await _context.SaveChangesAsync();

        return Ok(product);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null)
            return NotFound(new { message = "Продукт не знайдено." });

        if (await _context.Rentals.AnyAsync(r => r.ProductId == id))
            return Conflict(new { message = "Неможливо видалити продукт, оскільки він зараз в оренді." });

        try
        {
            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (DbUpdateException)
        {
            return Conflict(new { message = "Неможливо видалити продукт, оскільки він зараз в оренді." });
        }
    }
}

public record ProductDto(
    string Title,
    string? Description,
    decimal Cost,
    decimal DailyRentalPrice
);