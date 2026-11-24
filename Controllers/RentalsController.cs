using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using lab_8.Models;

namespace lab_8.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RentalsController : ControllerBase
{
    private readonly RentalDbContext _context;

    public RentalsController(RentalDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Rental>>> GetAll()
    {
        return await _context.Rentals
            .Include(r => r.Client)
            .Include(r => r.Product)
            .OrderBy(r => r.Id)
            .ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Rental>> GetById(int id)
    {
        var rental = await _context.Rentals
            .Include(r => r.Client)
            .Include(r => r.Product)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (rental == null)
            return NotFound(new { message = "Запис оренди не знайдено." });

        return rental;
    }

    [HttpPost]
    public async Task<ActionResult<Rental>> Create(RentalDto dto)
    {
        if (!await _context.Clients.AnyAsync(c => c.Id == dto.ClientId))
            return BadRequest(new { message = "Обраного клієнта не існує." });

        if (!await _context.Products.AnyAsync(p => p.Id == dto.ProductId))
            return BadRequest(new { message = "Обраного продукту не існує." });

        if (dto.ReturnDate.HasValue && dto.ReturnDate.Value < dto.IssueDate)
            return BadRequest(new { message = "Дата повернення не може бути раніше дати видачі." });

        var rental = new Rental
        {
            ClientId = dto.ClientId,
            ProductId = dto.ProductId,
            IssueDate = dto.IssueDate,
            ReturnDate = dto.ReturnDate
        };

        _context.Rentals.Add(rental);
        await _context.SaveChangesAsync();

        var created = await _context.Rentals
            .Include(r => r.Client)
            .Include(r => r.Product)
            .FirstAsync(r => r.Id == rental.Id);

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Rental>> Update(int id, RentalDto dto)
    {
        var rental = await _context.Rentals.FindAsync(id);
        if (rental == null)
            return NotFound(new { message = "Запис оренди не знайдено." });

        if (!await _context.Clients.AnyAsync(c => c.Id == dto.ClientId))
            return BadRequest(new { message = "Обраного клієнта не існує." });

        if (!await _context.Products.AnyAsync(p => p.Id == dto.ProductId))
            return BadRequest(new { message = "Обраного продукту не існує." });

        if (dto.ReturnDate.HasValue && dto.ReturnDate.Value < dto.IssueDate)
            return BadRequest(new { message = "Дата повернення не може бути раніше дати видачі." });

        rental.ClientId = dto.ClientId;
        rental.ProductId = dto.ProductId;
        rental.IssueDate = dto.IssueDate;
        rental.ReturnDate = dto.ReturnDate;

        await _context.SaveChangesAsync();

        var updated = await _context.Rentals
            .Include(r => r.Client)
            .Include(r => r.Product)
            .FirstAsync(r => r.Id == rental.Id);

        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var rental = await _context.Rentals.FindAsync(id);
        if (rental == null)
            return NotFound(new { message = "Запис оренди не знайдено." });

        _context.Rentals.Remove(rental);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

public record RentalDto(
    int ClientId,
    int ProductId,
    DateOnly IssueDate,
    DateOnly? ReturnDate
);